"""
Compare exported list columns to target Graph columns; gate item import.

Writes per-list `reports/schema_diff_<list>.json` + `.md` and `reports/schema_diff_summary.json`.
"""

from __future__ import annotations

import logging
import sys
import uuid
from pathlib import Path
from typing import Any

_SP = Path(__file__).resolve().parents[1]
if str(_SP) not in sys.path:
    sys.path.insert(0, str(_SP))

from migration.column_schema import (
    choice_allow_multiple_values,
    column_kind,
    normalize_choices,
    safe_report_filename_segment,
    schema_field_signature,
)
from migration import import_client
from migration import import_context as ctx
from migration import sp_client
from migration.list_allowlist import effective_export_list_names

logger = logging.getLogger(__name__)


def _guid_norm(g: str) -> str:
    return (g or "").strip().strip("{}").lower()


def _is_graph_list_guid(value: object) -> bool:
    """True if value looks like a list id from Graph/export (UUID), not a token like AppPrincipals."""
    if value is None:
        return False
    raw = str(value).strip()
    if not raw:
        return False
    try:
        uuid.UUID(raw.strip("{}"), version=None)
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def _guid_to_export_name(index_lists: list[dict]) -> dict[str, str]:
    m: dict[str, str] = {}
    for e in index_lists:
        gid = _guid_norm(str(e.get("id") or ""))
        name = (e.get("name") or "").strip()
        if gid and name:
            m[gid] = name
    return m


def _target_cols_by_name(site_id: str, list_id: str) -> dict[str, dict]:
    cols = sp_client.get_list_columns(site_id, list_id) or []
    return {(c.get("name") or "").strip(): c for c in cols if c.get("name")}


def _lookup_targets_match(
    export_col: dict[str, Any],
    target_col: dict[str, Any],
    *,
    name_map: dict[str, str],
    guid_to_name: dict[str, str],
) -> bool:
    elu = export_col.get("lookup") or {}
    tlu = target_col.get("lookup") or {}
    if str(elu.get("columnName") or "") != str(tlu.get("columnName") or ""):
        return False
    if bool(elu.get("allowMultipleValues")) != bool(tlu.get("allowMultipleValues")):
        return False
    src_list_id = elu.get("listId")
    # Exports often use SharePoint tokens (e.g. AppPrincipals) for App Author/Editor — not in index.json.
    if not _is_graph_list_guid(src_list_id):
        return True
    src_guid = _guid_norm(str(src_list_id))
    prereq_name = guid_to_name.get(src_guid)
    if not prereq_name:
        return False
    expected_target_list_id = name_map.get(prereq_name)
    if not expected_target_list_id:
        return False
    return str(tlu.get("listId") or "") == str(expected_target_list_id)


def _compare_field(
    export_col: dict[str, Any],
    target_col: dict[str, Any] | None,
    *,
    name_map: dict[str, str],
    guid_to_name: dict[str, str],
) -> dict[str, Any]:
    name = export_col.get("name")
    ek = column_kind(export_col)
    required = bool(export_col.get("required"))
    readonly = bool(export_col.get("readOnly"))

    if target_col is None:
        if readonly:
            return {"name": name, "status": "ok_optional_missing", "reason": "export_readonly_no_target_needed"}
        if required:
            return {"name": name, "status": "missing_in_target", "blocking": True}
        return {"name": name, "status": "missing_in_target_optional", "blocking": False}

    tk = column_kind(target_col)
    if ek != tk:
        return {
            "name": name,
            "status": "type_mismatch",
            "blocking": required,
            "exportKind": ek,
            "targetKind": tk,
        }

    if ek == "choice":
        ec = export_col.get("choice") or {}
        tc = target_col.get("choice") or {}
        if normalize_choices(ec.get("choices")) != normalize_choices(tc.get("choices")):
            return {"name": name, "status": "settings_diff", "blocking": True, "detail": "choices_differ"}
        em = choice_allow_multiple_values(export_col)
        tm = choice_allow_multiple_values(target_col)
        if em != tm:
            return {"name": name, "status": "settings_diff", "blocking": True, "detail": "allowMultipleValues_differ"}

    if ek == "lookup":
        if not _lookup_targets_match(export_col, target_col, name_map=name_map, guid_to_name=guid_to_name):
            return {"name": name, "status": "settings_diff", "blocking": True, "detail": "lookup_target_mismatch"}

    # Light signature compare for debugging
    es = schema_field_signature(export_col)
    ts = schema_field_signature(target_col)
    if es.get("kind") != ts.get("kind"):
        return {"name": name, "status": "type_mismatch", "blocking": required, "exportSig": es, "targetSig": ts}

    return {"name": name, "status": "ok", "blocking": False}


def _markdown_for_list(list_name: str, diff: dict[str, Any]) -> str:
    lines = [
        f"# Schema diff: `{list_name}`",
        "",
        f"- **itemImportReady**: {diff.get('itemImportReady')}",
        f"- **targetListId**: `{diff.get('targetListId')}`",
        "",
        "## Fields",
        "",
    ]
    for row in diff.get("fields") or []:
        lines.append(f"- `{row.get('name')}` — **{row.get('status')}**")
        if row.get("detail"):
            lines.append(f"  - detail: {row.get('detail')}")
        if row.get("blocking"):
            lines.append("  - **blocking**")
    lines.append("")
    return "\n".join(lines)


def run_report() -> dict[str, Any]:
    ctx.load_migration_target_env()
    sp_client.authenticate()
    site_id = import_client.target_site_id()
    name_map = import_client.load_list_id_map()

    idx = import_client.read_json(import_client.lists_index_path())
    lists_meta = idx.get("lists") or []
    guid_to_name = _guid_to_export_name(lists_meta)
    root = ctx.migration_export_root()
    allow = effective_export_list_names(lists_meta)
    if allow is not None:
        logger.info("MIGRATION_LIST_ALLOWLIST active: schema_diff for %s list(s).", len(allow))

    summary_lists: list[dict[str, Any]] = []

    for e in lists_meta:
        export_name = (e.get("name") or "").strip()
        rel = (e.get("exportPath") or "").strip()
        tmpl = (e.get("listTemplate") or "").lower()
        if not export_name:
            continue
        if allow is not None and export_name not in allow:
            continue

        seg = safe_report_filename_segment(export_name)

        if export_name == "SitePages" or tmpl in ("sitepages", "sitepageslibrary", "webpagelibrary"):
            diff = {
                "exportInternalName": export_name,
                "displayName": e.get("displayName"),
                "targetListId": name_map.get(export_name),
                "itemImportReady": True,
                "skippedReason": "handled_by_provision_pages",
                "fields": [],
            }
            import_client.write_migration_reports_json(f"schema_diff_{seg}", diff)
            import_client.write_migration_reports_markdown(f"schema_diff_{seg}", _markdown_for_list(export_name, diff))
            summary_lists.append({"list": export_name, "itemImportReady": True, "note": "handled_by_provision_pages"})
            continue

        if tmpl == "documentlibrary":
            diff = {
                "exportInternalName": export_name,
                "displayName": e.get("displayName"),
                "targetListId": name_map.get(export_name),
                "itemImportReady": True,
                "skippedReason": "document_library_items_not_imported_via_this_step",
                "fields": [],
            }
            import_client.write_migration_reports_json(f"schema_diff_{seg}", diff)
            import_client.write_migration_reports_markdown(f"schema_diff_{seg}", _markdown_for_list(export_name, diff))
            summary_lists.append(
                {"list": export_name, "itemImportReady": True, "note": "document_library"}
            )
            continue

        target_id = name_map.get(export_name)
        if not target_id or target_id == "dry-run-not-created":
            diff = {
                "exportInternalName": export_name,
                "displayName": e.get("displayName"),
                "targetListId": None,
                "itemImportReady": False,
                "blockingReason": "target_list_missing_in_map_run_import_lists_first",
                "fields": [],
            }
            import_client.write_migration_reports_json(f"schema_diff_{seg}", diff)
            import_client.write_migration_reports_markdown(f"schema_diff_{seg}", _markdown_for_list(export_name, diff))
            summary_lists.append({"list": export_name, "itemImportReady": False})
            continue

        cols_path = root / rel / "columns.json"
        if not cols_path.is_file():
            diff = {
                "exportInternalName": export_name,
                "targetListId": target_id,
                "itemImportReady": False,
                "blockingReason": "missing_columns_export",
                "fields": [],
            }
            import_client.write_migration_reports_json(f"schema_diff_{seg}", diff)
            import_client.write_migration_reports_markdown(f"schema_diff_{seg}", _markdown_for_list(export_name, diff))
            summary_lists.append({"list": export_name, "itemImportReady": False})
            continue

        export_cols = import_client.read_json(cols_path)
        if not isinstance(export_cols, list):
            export_cols = []

        target_by_name = _target_cols_by_name(site_id, target_id)

        field_rows: list[dict[str, Any]] = []
        blocking = False

        for ec in export_cols:
            if not isinstance(ec, dict):
                continue
            cname = (ec.get("name") or "").strip()
            if not cname:
                continue
            # Dependent (projected) lookup columns — do not gate item import on these
            if column_kind(ec) == "lookup" and ec.get("readOnly"):
                lu = ec.get("lookup") or {}
                if lu.get("primaryLookupColumnId"):
                    continue
            if column_kind(ec) == "calculated":
                continue
            if ec.get("system"):
                continue
            ek_pre = column_kind(ec)
            if ek_pre is None:
                req = bool(ec.get("required"))
                row = {
                    "name": cname,
                    "status": "unknown_export_type",
                    "blocking": req,
                    "detail": "no_recognized_graph_column_shape",
                }
                field_rows.append(row)
                if req:
                    blocking = True
                continue

            tc = target_by_name.get(cname)
            row = _compare_field(ec, tc, name_map=name_map, guid_to_name=guid_to_name)
            field_rows.append(row)
            if row.get("blocking"):
                blocking = True

        item_ready = not blocking
        diff = {
            "exportInternalName": export_name,
            "displayName": e.get("displayName"),
            "targetListId": target_id,
            "itemImportReady": item_ready,
            "blocking": blocking,
            "fields": field_rows,
        }
        import_client.write_migration_reports_json(f"schema_diff_{seg}", diff)
        import_client.write_migration_reports_markdown(f"schema_diff_{seg}", _markdown_for_list(export_name, diff))
        summary_lists.append({"list": export_name, "itemImportReady": item_ready})

    blocking_lists = sum(
        1
        for x in summary_lists
        if not x.get("itemImportReady") and x.get("note") != "document_library"
    )
    summary = {
        "targetSite": ctx.migration_target_site_name(),
        "lists": summary_lists,
        "counts": {
            "total": len(summary_lists),
            "ready": sum(1 for x in summary_lists if x.get("itemImportReady")),
            "notReady": sum(1 for x in summary_lists if not x.get("itemImportReady")),
            "blockingLists": blocking_lists,
        },
        "errorCount": blocking_lists,
    }
    import_client.write_migration_reports_json("schema_diff_summary", summary)
    return summary


def load_item_import_ready(export_name: str) -> bool:
    seg = safe_report_filename_segment(export_name)
    p = ctx.reports_dir() / f"schema_diff_{seg}.json"
    if not p.is_file():
        return False
    data = import_client.read_json(p)
    return bool(data.get("itemImportReady"))


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    r = run_report()
    print(
        f"schema_diff: lists={r['counts']['total']} ready={r['counts']['ready']} "
        f"notReady={r['counts']['notReady']}"
    )


if __name__ == "__main__":
    main()
