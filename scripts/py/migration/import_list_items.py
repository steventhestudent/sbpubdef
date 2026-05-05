"""
Step 7: Import list items from `list_items/*.jsonl` into mapped target lists.

Requires `import_reports/list_name_to_new_id.json` from `import_lists.py`.

- Preserves field **internal names** from export (e.g. `Statuc`).
- Strips read-only / system fields before POST.
- Lookup / person fields may fail on target tenant — failures are captured in the report.

Use `MIGRATION_DRY_RUN=true` to count rows without POSTing.
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

_SP = Path(__file__).resolve().parents[1]
if str(_SP) not in sys.path:
    sys.path.insert(0, str(_SP))

from azure_function.sbpubdef.local_upload import add_list_item

from migration import import_client
from migration import import_context as ctx
from migration import sp_client

logger = logging.getLogger(__name__)

def _acceptable_field_keys(site_id: str, list_id: str) -> set[str]:
    """
    Determine which `fields` keys are likely accepted by Graph for create.

    - Always allow actual column internal names.
    - Also allow the common Graph pattern for lookups/person fields: `<Name>LookupId`.
      (Exported JSONL often uses that form.)
    """
    cols = sp_client.get_list_columns(site_id, list_id) or []
    allowed: set[str] = set()
    for c in cols:
        name = (c.get("name") or "").strip()
        if not name:
            continue
        allowed.add(name)
        # When a column is lookup-like, Graph listItem.fields commonly uses NameLookupId
        if "lookup" in c or "personOrGroup" in c:
            allowed.add(f"{name}LookupId")
    # Never allow these even if they appear in exports
    allowed.discard("AuthorLookupId")
    allowed.discard("EditorLookupId")
    return allowed


def run_import() -> dict:
    ctx.load_migration_target_env()
    sp_client.authenticate()
    dry = ctx.migration_dry_run()
    site_id = import_client.target_site_id()
    name_map = import_client.load_list_id_map()
    if not name_map:
        raise RuntimeError("Missing list_name_to_new_id.json — run import_lists.py first.")
    if any(v == "dry-run-not-created" for v in name_map.values()):
        report = {
            "skipped": True,
            "reason": "import_lists was run with MIGRATION_DRY_RUN=true — re-run without dry run before importing items.",
        }
        import_client.write_report("import_list_items", report)
        return report

    idx = import_client.read_json(import_client.lists_index_path())
    created = 0
    skipped = 0
    errors: list[dict] = []
    dropped_fields_total = 0
    dropped_field_keys: dict[str, int] = {}

    for entry in idx.get("lists") or []:
        export_name = (entry.get("name") or "").strip()
        export_id = (entry.get("id") or "").strip()
        if not export_name or not export_id:
            continue
        tmpl = (entry.get("listTemplate") or "").lower()
        if tmpl == "documentlibrary":
            skipped += 1
            continue

        list_id = name_map.get(export_name)
        if not list_id or list_id == "dry-run-not-created":
            skipped += 1
            continue

        jsonl = import_client.list_item_jsonl_for_export_list(export_name, export_id)
        if not jsonl or not jsonl.is_file():
            continue

        allowed_keys = _acceptable_field_keys(site_id, list_id)

        with open(jsonl, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                row = json.loads(line)
                raw_fields = import_client.fields_for_graph_create(row.get("fields") or {})
                # Filter to columns that exist on the target list (plus lookup id variants).
                fields: dict = {}
                for k, v in raw_fields.items():
                    if k in allowed_keys:
                        fields[k] = v
                    else:
                        dropped_fields_total += 1
                        dropped_field_keys[k] = dropped_field_keys.get(k, 0) + 1
                if dry:
                    created += 1
                    continue
                try:
                    res = add_list_item(site_id, list_id, fields)
                    if isinstance(res, dict) and res.get("error"):
                        errors.append({"list": export_name, "error": res})
                    else:
                        created += 1
                except Exception as e:
                    errors.append({"list": export_name, "error": str(e)[:500]})

    report = {
        "dryRun": dry,
        "itemsCreatedOrCounted": created,
        "listsSkippedDocLibOrMissing": skipped,
        "droppedFieldsTotal": dropped_fields_total,
        "topDroppedFieldKeys": sorted(
            [{"field": k, "count": v} for k, v in dropped_field_keys.items()],
            key=lambda x: x["count"],
            reverse=True,
        )[:40],
        "errorSamples": errors[:300],
        "errorCount": len(errors),
    }
    import_client.write_report("import_list_items", report)
    return report


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    r = run_import()
    print(f"import_list_items: items={r['itemsCreatedOrCounted']} errors={r['errorCount']} dryRun={r['dryRun']}")


if __name__ == "__main__":
    main()
