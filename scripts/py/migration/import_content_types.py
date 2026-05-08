"""
Step 3 (partial): Site content types via Graph.

Full fidelity recreation of inherited / hub content types is not safely automated here.
This script inventories the export and emits a manual checklist + optional dry-run log.

For many tenants, content types are recreated by hub association or manual admin work.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Any

_SP = Path(__file__).resolve().parents[1]
if str(_SP) not in sys.path:
    sys.path.insert(0, str(_SP))

from migration import import_client
from migration import import_context as ctx
from migration import sp_client

logger = logging.getLogger(__name__)

_TARGET_CT_NAMES = ("PD Announcement", "PD Events")
_TARGET_PDDEPT_COL_NAME = "PDDepartment"
_SITEPAGES_INTERNAL_NAME = "SitePages"


def _find_ct_by_name(types: list[dict[str, Any]], name: str) -> dict[str, Any] | None:
    want = (name or "").strip().lower()
    for ct in types:
        if str(ct.get("name") or "").strip().lower() == want:
            return ct
    return None


def _get_site_columns(site_id: str) -> list[dict[str, Any]]:
    url = f"{sp_client.GRAPH_V1}/sites/{site_id}/columns"
    return sp_client.graph_get_all(url, params={"$top": "999"})  # type: ignore[arg-type]


def _find_site_column_id(site_id: str, name: str) -> str | None:
    want = (name or "").strip().lower()
    for c in _get_site_columns(site_id):
        if str(c.get("name") or "").strip().lower() == want:
            return str(c.get("id") or "").strip() or None
    return None


def _ensure_site_content_type(
    site_id: str, *, name: str, export_ct: dict[str, Any]
) -> tuple[dict[str, Any] | None, str | None]:
    """
    Ensure a site-scoped content type exists on the target site.
    If missing, create it using export metadata (name/description/group/parentId).
    """
    existing = sp_client.graph_get_all(
        f"{sp_client.GRAPH_V1}/sites/{site_id}/contentTypes", params={"$top": "200"}
    )
    found = _find_ct_by_name(existing, name)
    if found:
        return found, None

    def try_create(*, base_id: str | None, base_name: str | None) -> tuple[dict[str, Any] | None, str | None]:
        body = {
            "name": name,
            "description": export_ct.get("description") or "",
            "group": export_ct.get("group") or "Custom",
        }
        # Graph expects "base" for create, not parentId.
        if base_id:
            body["base"] = {"id": base_id, "name": (base_name or "")}
        r = sp_client.graph_post(f"{sp_client.GRAPH_V1}/sites/{site_id}/contentTypes", json_body=body)
        if r.status_code < 300:
            return r.json(), None
        return None, r.text[:1200]

    base = export_ct.get("base") or {}
    base_id = str(base.get("id") or "").strip() or None
    base_name = str(base.get("name") or "").strip() or None

    # First try export base verbatim.
    created, err = try_create(base_id=base_id, base_name=base_name)
    if created:
        return created, None

    # If the base isn't accepted, fall back to resolving base by name on the target.
    err_compact = (err or "").replace(" ", "").lower()
    if "invalidctparentid" in err_compact or "missingorincorrectparentid" in err_compact:
        parent_name = str(base.get("name") or "").strip() or "Item"
        resolved = _find_ct_by_name(existing, parent_name)
        resolved_id = str((resolved or {}).get("id") or "").strip()
        if resolved_id:
            created2, err2 = try_create(base_id=resolved_id, base_name=parent_name)
            if created2:
                return created2, None
            err = err2
        # Final fallback: create under Item so CT exists in gallery; operator can adjust later.
        created3, err3 = try_create(base_id="0x01", base_name="Item")
        if created3:
            return created3, None
        return None, err3

    return None, err


def _add_site_column_to_content_type(site_id: str, *, content_type_id: str, site_column_id: str) -> tuple[bool, str]:
    """
    Link an existing site column into a content type via sourceColumn@odata.bind.
    """
    url = f"{sp_client.GRAPH_V1}/sites/{site_id}/contentTypes/{content_type_id}/columns"
    body = {"sourceColumn@odata.bind": f"{sp_client.GRAPH_V1}/sites/{site_id}/columns/{site_column_id}"}
    r = sp_client.graph_post(url, json_body=body)
    if r.status_code < 300:
        return True, ""
    txt = r.text[:1200]
    compact = txt.replace(" ", "").lower()
    if "columnexists" in compact:
        return True, ""
    return False, txt


def _add_content_type_to_list(site_id: str, *, list_id: str, site_content_type_id: str) -> tuple[bool, str]:
    """
    Best-effort: add a copy of a site content type to a list/library.
    Uses beta `addCopy` because v1 lacks this action.
    """
    url = f"{sp_client.GRAPH_BETA}/sites/{site_id}/lists/{list_id}/contentTypes/addCopy"
    body = {"contentType": f"{sp_client.GRAPH_V1}/sites/{site_id}/contentTypes/{site_content_type_id}"}
    r = sp_client.graph_post(url, json_body=body)
    if r.status_code < 300:
        return True, ""
    txt = r.text[:1200]
    compact = txt.replace(" ", "").lower()
    if "listctexists" in compact:
        return True, ""
    return False, txt


def run_import() -> dict:
    ctx.load_migration_target_env()
    sp_client.authenticate()
    root = ctx.migration_export_root()
    ct_path = root / "content_types" / "site_content_types.json"
    if not ct_path.is_file():
        report = {"error": f"Missing export file {ct_path}", "manualSteps": []}
        import_client.write_report("import_content_types", report)
        return report
    data = import_client.read_json(ct_path)
    types = data.get("value") or data.get("types") or []
    if not isinstance(types, list):
        types = []

    site_id = import_client.target_site_id()
    name_map = import_client.load_list_id_map()
    sitepages_list_id = name_map.get(_SITEPAGES_INTERNAL_NAME) or ""

    automation: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []

    pddept_col_id = _find_site_column_id(site_id, _TARGET_PDDEPT_COL_NAME)

    for ct_name in _TARGET_CT_NAMES:
        export_ct = _find_ct_by_name(types, ct_name)
        if not export_ct:
            automation.append({"contentType": ct_name, "status": "missing_in_export_skip"})
            continue
        ensured, err = _ensure_site_content_type(site_id, name=ct_name, export_ct=export_ct)
        if not ensured:
            errors.append({"contentType": ct_name, "step": "create_site_content_type", "error": err})
            continue

        ct_id = str(ensured.get("id") or "").strip()
        automation.append({"contentType": ct_name, "status": "present", "id": ct_id})

        if pddept_col_id and ct_id:
            ok, e2 = _add_site_column_to_content_type(site_id, content_type_id=ct_id, site_column_id=pddept_col_id)
            if ok:
                automation.append({"contentType": ct_name, "status": "linked_PDDepartment"})
            else:
                errors.append({"contentType": ct_name, "step": "link_PDDepartment", "error": e2})
        else:
            automation.append({"contentType": ct_name, "status": "PDDepartment_site_column_not_found_or_ct_missing_skip"})

        if sitepages_list_id and ct_id:
            ok, e3 = _add_content_type_to_list(site_id, list_id=sitepages_list_id, site_content_type_id=ct_id)
            if ok:
                automation.append({"contentType": ct_name, "status": "added_to_SitePages"})
            else:
                errors.append({"contentType": ct_name, "step": "add_to_SitePages", "error": e3})
        else:
            automation.append({"contentType": ct_name, "status": "SitePages_list_id_missing_skip"})

    manual = [
        "Review exported site_content_types.json and hub content type publishing on the target tenant.",
        "Create or map content types in SharePoint admin / Content type gallery as needed.",
        "Do not POST inherited types blindly — IDs and parent chains differ per tenant.",
        "For Site Pages: ensure 'Allow management of content types' is enabled on the Site Pages library if needed.",
    ]
    report = {
        "exportedTypeCount": len(types) if isinstance(types, list) else 0,
        "automatedCreates": sum(1 for x in automation if x.get("status") == "present"),
        "targetedAutomation": automation,
        "errorCount": len(errors),
        "errors": errors,
        "manualSteps": manual,
        "note": "Arbitrary content type recreation remains out of scope; this step automates only specific project content types (PD Announcement / PD Events).",
    }
    import_client.write_report("import_content_types", report)
    import_client.write_text_report(
        "import_content_types_checklist",
        "# Content types — manual rebuild\n\n" + "\n".join(f"- {m}" for m in manual),
    )
    return report


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    run_import()
    print("import_content_types: see import_reports/import_content_types*.json|md")


if __name__ == "__main__":
    main()
