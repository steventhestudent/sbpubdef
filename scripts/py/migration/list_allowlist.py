"""
Optional MIGRATION_LIST_ALLOWLIST: limit list steps to named exports plus lookup prerequisites.

Comma-separated **internal** export names (same keys as lists/index.json `name`).
For each allowed list, any list referenced by a lookup column is added automatically
so import_list_columns phase 2 can resolve target list ids.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

from migration.column_schema import column_kind
from migration import import_client
from migration import import_context as ctx

logger = logging.getLogger(__name__)


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


def parse_allowlist_seed() -> frozenset[str] | None:
    raw = (os.getenv("MIGRATION_LIST_ALLOWLIST") or "").strip()
    if not raw:
        return None
    return frozenset(x.strip() for x in raw.split(",") if x.strip())


def expand_lookup_prerequisites(
    seed: set[str],
    lists_meta: list[dict],
    export_root: Path,
    guid_to_name: dict[str, str],
) -> set[str]:
    valid = {(e.get("name") or "").strip() for e in lists_meta if (e.get("name") or "").strip()}
    unknown = seed - valid
    if unknown:
        logger.warning(
            "MIGRATION_LIST_ALLOWLIST: unknown internal name(s) (ignored): %s",
            ", ".join(sorted(unknown)),
        )
    out = set(seed) & valid
    changed = True
    while changed:
        changed = False
        for name in list(out):
            entry = next((e for e in lists_meta if (e.get("name") or "").strip() == name), None)
            if not entry:
                continue
            rel = (entry.get("exportPath") or "").strip()
            if not rel:
                continue
            p = export_root / rel / "columns.json"
            if not p.is_file():
                continue
            cols = import_client.read_json(p)
            if not isinstance(cols, list):
                continue
            for col in cols:
                if not isinstance(col, dict):
                    continue
                if column_kind(col) != "lookup":
                    continue
                lu = col.get("lookup") or {}
                if col.get("readOnly") and lu.get("primaryLookupColumnId"):
                    continue
                gid = _guid_norm(str(lu.get("listId") or ""))
                prereq = guid_to_name.get(gid)
                if prereq and prereq in valid and prereq not in out:
                    out.add(prereq)
                    changed = True
                    logger.info(
                        "Allowlist expansion: added lookup prerequisite %r (required by %r)",
                        prereq,
                        name,
                    )
    return out


def effective_export_list_names(lists_meta: list[dict]) -> set[str] | None:
    """
    If MIGRATION_LIST_ALLOWLIST is set, return expanded internal list names to process.
    Otherwise None (all lists from index).
    """
    seed = parse_allowlist_seed()
    if seed is None:
        return None
    root = ctx.migration_export_root()
    guid_to_name = _guid_to_export_name(lists_meta)
    return expand_lookup_prerequisites(set(seed), lists_meta, root, guid_to_name)
