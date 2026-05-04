"""
Step 5: Create list columns on the target site from each exported `columns.json`.

Only **text** columns are auto-created (Graph `POST .../columns` with `text: {}`).
All other column kinds are listed in `import_reports/import_list_columns_manual.json` for
UI / PnP follow-up.

Internal names (e.g. `Statuc`) are passed through unchanged.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

_SP = Path(__file__).resolve().parents[1]
if str(_SP) not in sys.path:
    sys.path.insert(0, str(_SP))

from migration import import_client
from migration import import_context as ctx
from migration import sp_client

logger = logging.getLogger(__name__)

SKIP_NAMES = {
    "Title",
    "LinkTitle",
    "Attachments",
    "Edit",
    "ContentType",
    "Modified",
    "Created",
    "Author",
    "Editor",
    "_UIVersionString",
}


def run_import() -> dict:
    ctx.load_migration_target_env()
    sp_client.authenticate()
    dry = ctx.migration_dry_run()
    site_id = import_client.target_site_id()
    name_map = import_client.load_list_id_map()
    idx = import_client.read_json(import_client.lists_index_path())
    manual: list[dict] = []
    created: list[dict] = []
    errors: list[dict] = []

    for entry in idx.get("lists") or []:
        export_name = (entry.get("name") or "").strip()
        rel = (entry.get("exportPath") or "").strip()
        if not export_name or not rel:
            continue
        list_id = name_map.get(export_name)
        if not list_id or list_id == "dry-run-not-created":
            manual.append({"list": export_name, "reason": "missing_list_id_in_map_run_import_lists_first"})
            continue

        cols_path = ctx.migration_export_root() / rel / "columns.json"
        if not cols_path.is_file():
            continue
        cols = import_client.read_json(cols_path)
        if not isinstance(cols, list):
            continue
        existing = {c.get("name") for c in sp_client.get_list_columns(site_id, list_id)}

        for col in cols:
            cname = col.get("name")
            if not cname or cname in SKIP_NAMES or cname in existing:
                continue
            if col.get("readOnly") or col.get("system"):
                continue
            if "text" not in col:
                manual.append({"list": export_name, "column": cname, "reason": "non_text_type"})
                continue

            url = f"{sp_client.GRAPH_V1}/sites/{site_id}/lists/{list_id}/columns"
            body = {"name": cname, "text": col.get("text") if isinstance(col.get("text"), dict) else {}}
            if dry:
                created.append({"list": export_name, "column": cname, "dryRun": True})
                continue
            r = sp_client.graph_post(url, json_body=body)
            if r.status_code < 300:
                created.append({"list": export_name, "column": cname})
            else:
                errors.append(
                    {"list": export_name, "column": cname, "status": r.status_code, "body": r.text[:800]}
                )

    report = {
        "dryRun": dry,
        "textColumnsCreated": len(created),
        "manualFollowUps": len(manual),
        "errors": len(errors),
        "created": created[:500],
        "manual": manual[:2000],
        "errorSamples": errors[:200],
    }
    import_client.write_report("import_list_columns", report)
    import_client.write_report("import_list_columns_manual", {"items": manual})
    return report


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    r = run_import()
    print(
        f"import_list_columns: textCreated={r['textColumnsCreated']} manual={r['manualFollowUps']} errors={r['errors']}"
    )


if __name__ == "__main__":
    main()
