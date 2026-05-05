"""
Step 4: Create lists and document libraries on the target site from `lists/index.json`.

- Skips names in MIGRATION_LIST_BLOCKLIST (comma-separated; default: users,TaxonomyHiddenList).
- Skips entries flagged `system: true` in the export index when MIGRATION_SKIP_SYSTEM_LISTS=true (default).
- If a list with the same display name already exists, reuses its id (idempotent).
- Writes `import_reports/list_name_to_new_id.json` mapping **export list `name`** → new Graph list id
  (required for `import_list_items.py`).

Internal list `name` from the source is preserved as the mapping key; Graph may assign a different
URL segment — items are keyed by **source export name** as stored in the JSONL filenames.
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

_SP = Path(__file__).resolve().parents[1]
if str(_SP) not in sys.path:
    sys.path.insert(0, str(_SP))

from migration import import_client
from migration import import_context as ctx
from migration import sp_client

logger = logging.getLogger(__name__)

def _blocklist() -> set[str]:
    raw = (os.getenv("MIGRATION_LIST_BLOCKLIST") or "users,TaxonomyHiddenList").strip()
    return {x.strip() for x in raw.split(",") if x.strip()}


def _skip_system_lists() -> bool:
    return (os.getenv("MIGRATION_SKIP_SYSTEM_LISTS") or "true").strip().lower() in ("1", "true", "yes", "on")


def _find_existing_list_id(site_id: str, display_name: str, internal_name: str) -> str | None:
    for lst in sp_client.get_site_lists(site_id, include_hidden=True):
        if lst.get("displayName") == display_name or lst.get("name") == internal_name:
            return lst.get("id")
    return None


def run_import() -> dict:
    ctx.load_migration_target_env()
    sp_client.authenticate()
    dry = ctx.migration_dry_run()
    site_id = import_client.target_site_id()
    idx_path = import_client.lists_index_path()
    if not idx_path.is_file():
        raise FileNotFoundError(f"Missing export index: {idx_path}")

    index = import_client.read_json(idx_path)
    lists_meta = index.get("lists") or []
    block = _blocklist()
    skip_sys = _skip_system_lists()

    name_to_new_id: dict[str, str] = {}
    created: list[dict] = []
    skipped: list[dict] = []
    errors: list[dict] = []

    for entry in lists_meta:
        name = (entry.get("name") or "").strip()
        disp = (entry.get("displayName") or name).strip()
        tmpl = (entry.get("listTemplate") or "genericList").strip()
        if not name:
            continue
        if name in block:
            skipped.append({"name": name, "reason": "blocklist"})
            continue
        if skip_sys and entry.get("system"):
            skipped.append({"name": name, "reason": "system_list"})
            continue

        existing = _find_existing_list_id(site_id, disp, name)
        if existing:
            name_to_new_id[name] = existing
            skipped.append({"name": name, "reason": "already_exists", "id": existing})
            continue

        body = {"displayName": disp, "list": {"template": tmpl}}
        url = f"{sp_client.GRAPH_V1}/sites/{site_id}/lists"
        if dry:
            created.append({"name": name, "dryRun": True, "wouldCreate": body})
            name_to_new_id[name] = "dry-run-not-created"
            continue

        r = sp_client.graph_post(url, json_body=body)
        # Some list templates are not valid in some tenants (or for app-only).
        # If we get "Invalid list template.", retry once as a generic list.
        if r.status_code == 400 and "Invalid list template" in (r.text or "") and tmpl.lower() != "genericlist":
            body2 = {"displayName": disp, "list": {"template": "genericList"}}
            r = sp_client.graph_post(url, json_body=body2)
            tmpl_used = "genericList"
        else:
            tmpl_used = tmpl

        if r.status_code < 300:
            data = r.json()
            new_id = data.get("id")
            if new_id:
                name_to_new_id[name] = new_id
            created.append({"name": name, "id": new_id, "displayName": disp, "template": tmpl_used})
        else:
            errors.append({"name": name, "status": r.status_code, "body": r.text[:2000], "template": tmpl_used})

    import_client.save_list_id_map(name_to_new_id)
    report = {
        "dryRun": dry,
        "createdCount": len(created),
        "skippedCount": len(skipped),
        "errorCount": len(errors),
        "created": created,
        "skipped": skipped,
        "errors": errors,
    }
    import_client.write_report("import_lists", report)
    return report


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    r = run_import()
    print(
        f"import_lists: created={r['createdCount']} skipped={r['skippedCount']} errors={r['errorCount']} "
        f"(map: import_reports/list_name_to_new_id.json)"
    )
    if r["errorCount"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
