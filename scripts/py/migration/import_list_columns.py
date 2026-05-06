"""
Step 5: Create list columns on the target site from each exported `columns.json`.

Supports common Graph column types; lookups are created in a second phase after all lists exist.
Preserves internal names (e.g. `Statuc`).
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

_SP = Path(__file__).resolve().parents[1]
if str(_SP) not in sys.path:
    sys.path.insert(0, str(_SP))

from migration.column_schema import build_graph_column_create_body, column_kind, safe_report_filename_segment
from migration.list_allowlist import effective_export_list_names
from migration.list_import_order import ordered_export_names
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


def _guid_norm(g: str) -> str:
    return (g or "").strip().strip("{}").lower()


def _guid_to_export_name(index_lists: list[dict]) -> dict[str, str]:
    m: dict[str, str] = {}
    for e in index_lists:
        gid = _guid_norm(str(e.get("id") or ""))
        name = (e.get("name") or "").strip()
        if gid and name:
            m[gid] = name
    return m


def run_import() -> dict:
    ctx.load_migration_target_env()
    sp_client.authenticate()
    dry = ctx.migration_dry_run()
    site_id = import_client.target_site_id()
    name_map = import_client.load_list_id_map()
    idx = import_client.read_json(import_client.lists_index_path())
    lists_meta = idx.get("lists") or []
    guid_to_name = _guid_to_export_name(lists_meta)
    root = ctx.migration_export_root()

    order = ordered_export_names(lists_meta)
    pos = {n: i for i, n in enumerate(order)}
    lists_sorted = sorted(lists_meta, key=lambda e: pos.get((e.get("name") or "").strip(), 10**9))
    allow = effective_export_list_names(lists_meta)
    if allow is not None:
        logger.info(
            "MIGRATION_LIST_ALLOWLIST active: provisioning columns for %s list(s).",
            len(allow),
        )

    manual: list[dict] = []
    created: list[dict] = []
    errors: list[dict] = []
    per_list_stats: dict[str, dict[str, int]] = {}

    def process_list(entry: dict, *, phase: int) -> None:
        export_name = (entry.get("name") or "").strip()
        rel = (entry.get("exportPath") or "").strip()
        if not export_name or not rel:
            return
        if allow is not None and export_name not in allow:
            return
        list_id = name_map.get(export_name)
        if not list_id or list_id == "dry-run-not-created":
            manual.append({"list": export_name, "reason": "missing_list_id_in_map_run_import_lists_first"})
            return

        cols_path = root / rel / "columns.json"
        if not cols_path.is_file():
            return
        cols = import_client.read_json(cols_path)
        if not isinstance(cols, list):
            return

        existing = {c.get("name") for c in sp_client.get_list_columns(site_id, list_id)}
        stats = per_list_stats.setdefault(
            export_name, {"created": 0, "skippedExisting": 0, "manual": 0, "errors": 0}
        )

        for col in cols:
            if not isinstance(col, dict):
                continue
            cname = col.get("name")
            if not cname or cname in SKIP_NAMES or cname in existing:
                if cname in existing:
                    stats["skippedExisting"] += 1
                continue
            if col.get("system"):
                continue
            if col.get("readOnly") and column_kind(col) != "lookup":
                continue
            kind = column_kind(col)
            if phase == 1 and kind == "lookup":
                if col.get("readOnly") and (col.get("lookup") or {}).get("primaryLookupColumnId"):
                    continue
                continue
            if phase == 2 and kind != "lookup":
                continue
            if phase == 2 and kind == "lookup" and col.get("readOnly"):
                continue

            if kind == "lookup":
                lu = col.get("lookup") or {}
                src_guid = _guid_norm(str(lu.get("listId") or ""))
                prereq = guid_to_name.get(src_guid)
                target_lookup_graph_id = name_map.get(prereq) if prereq else None
                body, reason = build_graph_column_create_body(
                    col, target_lookup_list_graph_id=target_lookup_graph_id
                )
                if body is None:
                    manual.append({"list": export_name, "column": cname, "reason": reason or "lookup_skip"})
                    stats["manual"] += 1
                    continue
            else:
                body, reason = build_graph_column_create_body(col, target_lookup_list_graph_id=None)
                if body is None:
                    manual.append({"list": export_name, "column": cname, "reason": reason or "skip"})
                    stats["manual"] += 1
                    continue

            url = f"{sp_client.GRAPH_V1}/sites/{site_id}/lists/{list_id}/columns"
            if dry:
                created.append({"list": export_name, "column": cname, "phase": phase, "dryRun": True})
                stats["created"] += 1
                continue
            r = sp_client.graph_post(url, json_body=body)
            if r.status_code < 300:
                created.append({"list": export_name, "column": cname, "phase": phase})
                existing.add(cname)
                stats["created"] += 1
            else:
                errors.append(
                    {
                        "list": export_name,
                        "column": cname,
                        "phase": phase,
                        "status": r.status_code,
                        "body": r.text[:800],
                    }
                )
                stats["errors"] += 1

    for phase in (1, 2):
        for entry in lists_sorted:
            process_list(entry, phase=phase)

    # Verbose summary per list
    for export_name, stats in sorted(per_list_stats.items()):
        logger.info(
            "[%s] columns phase1+2: created=%s skippedExisting=%s manual=%s errors=%s dryRun=%s",
            export_name,
            stats["created"],
            stats["skippedExisting"],
            stats["manual"],
            stats["errors"],
            dry,
        )

    report = {
        "dryRun": dry,
        "textColumnsCreated": len(created),
        "columnsCreatedOrDryRun": len(created),
        "manualFollowUps": len(manual),
        "errors": len(errors),
        "errorCount": len(errors),
        "created": created[:800],
        "manual": manual[:2000],
        "errorSamples": errors[:200],
        "perList": {safe_report_filename_segment(k): v for k, v in per_list_stats.items()},
    }
    import_client.write_report("import_list_columns", report)
    import_client.write_report("import_list_columns_manual", {"items": manual})
    return report


def main() -> None:
    import os

    if "--dry-run" in sys.argv:
        os.environ["MIGRATION_DRY_RUN"] = "true"
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    r = run_import()
    print(
        f"import_list_columns: createdRows={r['textColumnsCreated']} manual={r['manualFollowUps']} errors={r['errors']}"
    )


if __name__ == "__main__":
    main()
