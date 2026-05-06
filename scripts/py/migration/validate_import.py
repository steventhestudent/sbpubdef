"""
Step 12: Compare target tenant snapshot vs export (read-only checks).

Does not mutate the target. Writes `import_reports/validate_import.json`.
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

_SP = Path(__file__).resolve().parents[1]
if str(_SP) not in sys.path:
    sys.path.insert(0, str(_SP))

from migration import import_client
from migration import import_context as ctx
from migration import sp_client
from migration.list_allowlist import effective_export_list_names

logger = logging.getLogger(__name__)


def _count_jsonl_rows(folder: Path) -> dict[str, int]:
    counts: dict[str, int] = {}
    if not folder.is_dir():
        return counts
    for fp in folder.glob("*.jsonl"):
        n = 0
        with open(fp, encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    n += 1
        counts[fp.name] = n
    return counts


def run_import() -> dict:
    ctx.load_migration_target_env()
    sp_client.authenticate()
    site_id = import_client.target_site_id()
    idx = import_client.read_json(import_client.lists_index_path())
    export_lists = idx.get("lists") or []
    allow = effective_export_list_names(export_lists)
    target_lists = sp_client.get_site_lists(site_id, include_hidden=True)
    target_by_name = {l.get("name"): l for l in target_lists}

    missing_lists = []
    for e in export_lists:
        name = e.get("name")
        if not name:
            continue
        if allow is not None and name not in allow:
            continue
        if name not in target_by_name:
            missing_lists.append(name)

    # Internal column name check: first list that has columns export with Statuc
    statuc_note = []
    root = ctx.migration_export_root()
    for e in export_lists:
        if allow is not None and e.get("name") not in allow:
            continue
        rel = e.get("exportPath")
        if not rel:
            continue
        cols = root / rel / "columns.json"
        if not cols.is_file():
            continue
        data = import_client.read_json(cols)
        names = [c.get("name") for c in data if isinstance(c, dict)]
        if "Statuc" in names:
            tlist = target_by_name.get(e.get("name"))
            if tlist:
                tcols = sp_client.get_list_columns(site_id, tlist["id"])
                tnames = {c.get("name") for c in tcols}
                statuc_note.append(
                    {
                        "list": e.get("name"),
                        "Statuc_in_target": "Statuc" in tnames,
                    }
                )
            break

    jsonl_counts = _count_jsonl_rows(root / "list_items")
    pages_dir = root / "pages"
    page_files = list(pages_dir.glob("*.json")) if pages_dir.is_dir() else []
    page_n = len([p for p in page_files if p.name != "index.json"])

    report = {
        "targetSite": ctx.migration_target_site_name(),
        "exportListCount": len(export_lists),
        "targetListCount": len(target_lists),
        "missingListInternalNames": missing_lists[:200],
        "statucSpotCheck": statuc_note,
        "exportJsonlFiles": len(jsonl_counts),
        "exportPageJsonFiles": page_n,
        "note": "Rough counts only; permissions and item-level ACLs are not verified here.",
    }
    import_client.write_report("validate_import", report)
    return report


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    r = run_import()
    print(
        f"validate_import: exportLists={r['exportListCount']} targetLists={r['targetListCount']} "
        f"missing={len(r['missingListInternalNames'])}"
    )


if __name__ == "__main__":
    main()
