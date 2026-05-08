"""
Read-only report: list display vs internal names, IDs, URLs, template — collision detection.

Writes `reports/list_identity_report.json` under the migration export root.
"""

from __future__ import annotations

import logging
import re
import sys
from collections import defaultdict
from pathlib import Path

_SP = Path(__file__).resolve().parents[1]
if str(_SP) not in sys.path:
    sys.path.insert(0, str(_SP))

from migration import import_client
from migration import import_context as ctx

_SUFFIX_DIGITS = re.compile(r".*\d+$")


def run_report() -> dict[str, object]:
    ctx.load_migration_target_env()
    idx_path = import_client.lists_index_path()
    if not idx_path.is_file():
        raise FileNotFoundError(f"Missing export index: {idx_path}")

    idx = import_client.read_json(idx_path)
    lists_meta = idx.get("lists") or []

    by_display: dict[str, list[str]] = defaultdict(list)
    rows: list[dict[str, object]] = []
    internal_suffix_digit_names: list[str] = []

    for e in lists_meta:
        name = (e.get("name") or "").strip()
        disp = (e.get("displayName") or name).strip()
        lid = (e.get("id") or "").strip()
        by_display[disp].append(name)
        rows.append(
            {
                "exportInternalName": name,
                "displayName": disp,
                "sourceListId": lid,
                "listTemplate": e.get("listTemplate"),
                "hidden": e.get("hidden"),
                "system": e.get("system"),
                "webUrl": e.get("webUrl"),
                "exportPath": e.get("exportPath"),
            }
        )
        if name and _SUFFIX_DIGITS.match(name):
            internal_suffix_digit_names.append(name)

    display_collisions = {k: v for k, v in by_display.items() if len(v) > 1}

    report: dict[str, object] = {
        "sourceSiteId": idx.get("siteId"),
        "listCount": len(rows),
        "lists": rows,
        "displayNameCollisions": display_collisions,
        "internalNamesWithNumericSuffix": sorted(set(internal_suffix_digit_names)),
        "notes": [
            "Internal list name is fixed at creation time; renaming display name does not change it.",
            "Review displayNameCollisions when mapping exports to target lists — display names are not unique.",
            "For this project, the target list identity should be canonical (internal name `Assignments`, not `Assignments1`).",
        ],
    }
    import_client.write_migration_reports_json("list_identity_report", report)
    return report


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    r = run_report()
    print(f"list_identity: lists={r['listCount']} displayCollisions={len(r['displayNameCollisions'])}")


if __name__ == "__main__":
    main()
