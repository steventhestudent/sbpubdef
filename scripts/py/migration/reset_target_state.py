"""
Surgical local-state reset for a clean rerun against the target tenant.

After you delete one or more lists in the SharePoint UI **and** empty both
recycle bins (site + site-collection second-stage), use this to remove only
the affected entries from local migration state so the next run of
`import_lists.py` / `import_list_columns.py` / `schema_diff.py` /
`import_list_items.py` starts clean for those lists without forcing every
other list to be re-resolved.

Mutates only **local** files. Does **not** call the target tenant.
Default is preview; pass `--apply` to actually write.

Files touched (when present):
  - import_reports/list_name_to_new_id.json   (removes named entries)
  - state/item_id_map.json                    (removes buckets whose source
                                               list GUID maps to one of the
                                               named lists)

Optional with `--remove-reports`:
  - reports/schema_diff_<list>.{json,md}
  - reports/item_import_failures_<list>.json

Lookup prerequisites of the named lists are expanded automatically (same
logic as `MIGRATION_LIST_ALLOWLIST`) so that lookup parents are reset too;
pass `--no-expand` to disable.

Usage (repo root):

    PYTHONPATH=scripts/py python3 scripts/py/migration/reset_target_state.py \
        --lists ProcedureSteps,Procedures

    PYTHONPATH=scripts/py python3 scripts/py/migration/reset_target_state.py \
        --lists ProcedureSteps --apply --remove-reports
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import shutil
import sys
import time
from pathlib import Path
from typing import Any

_SP = Path(__file__).resolve().parents[1]
if str(_SP) not in sys.path:
    sys.path.insert(0, str(_SP))

from migration.column_schema import safe_report_filename_segment
from migration.list_allowlist import expand_lookup_prerequisites
from migration import import_client
from migration import import_context as ctx

logger = logging.getLogger(__name__)


def _guid_norm(g: str) -> str:
    return (g or "").strip().strip("{}").lower()


def _parse_names(raw: str) -> list[str]:
    return [x.strip() for x in (raw or "").split(",") if x.strip()]


def _load_lists_meta() -> list[dict[str, Any]]:
    idx_path = import_client.lists_index_path()
    if not idx_path.is_file():
        raise FileNotFoundError(
            f"Missing export index: {idx_path}. Run export first or set MIGRATION_EXPORT_DIR."
        )
    idx = import_client.read_json(idx_path)
    lists_meta = idx.get("lists") or []
    if not isinstance(lists_meta, list):
        raise ValueError(f"Malformed export index: {idx_path}")
    return lists_meta


def _resolve_target_names(seed: list[str], lists_meta: list[dict[str, Any]], expand: bool) -> set[str]:
    valid = {(e.get("name") or "").strip() for e in lists_meta if (e.get("name") or "").strip()}
    requested = set(seed)
    unknown = requested - valid
    if unknown:
        logger.warning(
            "Unknown internal list name(s) in --lists (ignored): %s",
            ", ".join(sorted(unknown)),
        )
    base = requested & valid
    if not expand:
        return base
    guid_to_name: dict[str, str] = {}
    for e in lists_meta:
        gid = _guid_norm(str(e.get("id") or ""))
        name = (e.get("name") or "").strip()
        if gid and name:
            guid_to_name[gid] = name
    expanded = expand_lookup_prerequisites(base, lists_meta, ctx.migration_export_root(), guid_to_name)
    return expanded


def _source_guids_for(names: set[str], lists_meta: list[dict[str, Any]]) -> dict[str, str]:
    """Map normalized source list GUID -> export internal name, for the named lists."""
    out: dict[str, str] = {}
    for e in lists_meta:
        name = (e.get("name") or "").strip()
        gid = _guid_norm(str(e.get("id") or ""))
        if name in names and gid:
            out[gid] = name
    return out


def _backup(path: Path) -> Path:
    ts = time.strftime("%Y%m%d-%H%M%S")
    bak = path.with_suffix(path.suffix + f".bak.{ts}")
    shutil.copy2(path, bak)
    return bak


def _save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


def _reset_list_id_map(
    names: set[str], *, apply: bool
) -> dict[str, Any]:
    path = ctx.import_reports_dir() / "list_name_to_new_id.json"
    if not path.is_file():
        return {"path": str(path), "exists": False, "removed": [], "kept": 0}

    current = import_client.read_json(path)
    if not isinstance(current, dict):
        return {"path": str(path), "exists": True, "error": "unexpected_shape", "removed": []}

    removed: list[dict[str, str]] = []
    new_map: dict[str, str] = {}
    for k, v in current.items():
        if k in names:
            removed.append({"name": k, "previousId": str(v)})
        else:
            new_map[k] = str(v)

    if apply and removed:
        backup = _backup(path)
        _save_json(path, new_map)
        return {
            "path": str(path),
            "exists": True,
            "removed": removed,
            "kept": len(new_map),
            "backup": str(backup),
        }
    return {
        "path": str(path),
        "exists": True,
        "removed": removed,
        "kept": len(new_map),
        "backup": None,
    }


def _reset_item_id_map(
    guid_to_name: dict[str, str], *, apply: bool
) -> dict[str, Any]:
    path = import_client.item_id_map_path()
    if not path.is_file():
        return {"path": str(path), "exists": False, "removedBuckets": []}

    current = import_client.read_json(path)
    if not isinstance(current, dict):
        return {"path": str(path), "exists": True, "error": "unexpected_shape", "removedBuckets": []}

    buckets = current.get("bySourceListId")
    if not isinstance(buckets, dict):
        return {"path": str(path), "exists": True, "error": "missing_bySourceListId", "removedBuckets": []}

    removed: list[dict[str, Any]] = []
    new_buckets: dict[str, dict[str, str]] = {}
    for gid, mapping in buckets.items():
        ngid = _guid_norm(gid)
        if ngid in guid_to_name:
            removed.append(
                {
                    "sourceListId": gid,
                    "listName": guid_to_name[ngid],
                    "itemCount": len(mapping) if isinstance(mapping, dict) else 0,
                }
            )
        else:
            new_buckets[gid] = mapping

    if apply and removed:
        backup = _backup(path)
        new_payload = dict(current)
        new_payload["bySourceListId"] = new_buckets
        _save_json(path, new_payload)
        return {
            "path": str(path),
            "exists": True,
            "removedBuckets": removed,
            "keptBuckets": len(new_buckets),
            "backup": str(backup),
        }
    return {
        "path": str(path),
        "exists": True,
        "removedBuckets": removed,
        "keptBuckets": len(new_buckets),
        "backup": None,
    }


def _reset_reports(names: set[str], *, apply: bool) -> dict[str, Any]:
    reports = ctx.reports_dir()
    removed: list[str] = []
    candidates: list[Path] = []
    for n in names:
        seg = safe_report_filename_segment(n)
        for stem in (f"schema_diff_{seg}.json", f"schema_diff_{seg}.md", f"item_import_failures_{seg}.json"):
            candidates.append(reports / stem)
    for p in candidates:
        if p.is_file():
            if apply:
                p.unlink()
            removed.append(str(p))
    return {"removed": removed, "considered": len(candidates)}


def run(
    *,
    lists: list[str],
    apply: bool,
    expand: bool,
    remove_reports: bool,
) -> dict[str, Any]:
    ctx.load_migration_target_env(strict=False)
    lists_meta = _load_lists_meta()
    target_names = _resolve_target_names(lists, lists_meta, expand=expand)
    if not target_names:
        return {
            "apply": apply,
            "expand": expand,
            "requested": lists,
            "resolved": [],
            "exportRoot": str(ctx.migration_export_root()),
            "note": "no matching lists in export index — nothing to do",
        }

    guid_to_name = _source_guids_for(target_names, lists_meta)

    list_id_map_result = _reset_list_id_map(target_names, apply=apply)
    item_id_map_result = _reset_item_id_map(guid_to_name, apply=apply)
    reports_result = _reset_reports(target_names, apply=apply) if remove_reports else {"skipped": True}

    return {
        "apply": apply,
        "expand": expand,
        "requested": lists,
        "resolved": sorted(target_names),
        "exportRoot": str(ctx.migration_export_root()),
        "listIdMap": list_id_map_result,
        "itemIdMap": item_id_map_result,
        "reports": reports_result,
    }


def _print_summary(result: dict[str, Any]) -> None:
    print(f"export root: {result.get('exportRoot')}")
    print(f"requested:   {', '.join(result.get('requested') or [])}")
    resolved = result.get("resolved") or []
    print(f"resolved:    {', '.join(resolved) if resolved else '(none)'}")
    if result.get("note"):
        print(result["note"])
        return

    lim = result.get("listIdMap") or {}
    if lim.get("exists") is False:
        print(f"list_name_to_new_id.json: not present ({lim.get('path')})")
    else:
        removed = lim.get("removed") or []
        print(f"list_name_to_new_id.json: {len(removed)} entry(ies) to remove, {lim.get('kept', 0)} kept")
        for r in removed:
            print(f"  - {r['name']} (was {r['previousId']})")
        if lim.get("backup"):
            print(f"  backup: {lim['backup']}")

    iim = result.get("itemIdMap") or {}
    if iim.get("exists") is False:
        print(f"state/item_id_map.json: not present ({iim.get('path')})")
    else:
        rb = iim.get("removedBuckets") or []
        total_items = sum(b.get("itemCount", 0) for b in rb)
        print(
            f"state/item_id_map.json: {len(rb)} bucket(s) to remove "
            f"(items: {total_items}), {iim.get('keptBuckets', 0)} bucket(s) kept"
        )
        for b in rb:
            print(f"  - {b['listName']} (sourceListId={b['sourceListId']}, items={b['itemCount']})")
        if iim.get("backup"):
            print(f"  backup: {iim['backup']}")

    rep = result.get("reports") or {}
    if rep.get("skipped"):
        print("reports: skipped (pass --remove-reports to clean per-list schema_diff/item_import_failures)")
    else:
        removed = rep.get("removed") or []
        print(f"reports: {len(removed)} file(s) {'removed' if result.get('apply') else 'would be removed'}")
        for p in removed:
            print(f"  - {p}")

    if not result.get("apply"):
        print("\nPREVIEW ONLY. Re-run with --apply to mutate.")


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(
        description="Surgically reset local migration state for named lists (preview by default).",
    )
    parser.add_argument(
        "--lists",
        default=os.getenv("MIGRATION_LIST_ALLOWLIST", ""),
        metavar="NAMES",
        help=(
            "Comma-separated export internal list names. "
            "Defaults to MIGRATION_LIST_ALLOWLIST if set."
        ),
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually mutate files (default is preview only). Backups are written next to each modified file.",
    )
    parser.add_argument(
        "--no-expand",
        action="store_true",
        help="Disable automatic inclusion of lookup-prerequisite lists.",
    )
    parser.add_argument(
        "--remove-reports",
        action="store_true",
        help="Also delete reports/schema_diff_<list>.{json,md} and reports/item_import_failures_<list>.json for each list.",
    )
    args = parser.parse_args()

    names = _parse_names(args.lists)
    if not names:
        parser.error("--lists is required (comma-separated export internal names)")

    try:
        result = run(
            lists=names,
            apply=args.apply,
            expand=not args.no_expand,
            remove_reports=args.remove_reports,
        )
    except FileNotFoundError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:
        print(f"Error: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1

    _print_summary(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
