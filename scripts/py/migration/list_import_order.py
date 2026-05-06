"""
Compute list item import order from exported lookup columns (parent lists before dependents).

Pure export-side DAG — no Graph calls.
Writes `reports/list_import_order.json`.
"""

from __future__ import annotations

import logging
import sys
from collections import defaultdict, deque
from pathlib import Path

_SP = Path(__file__).resolve().parents[1]
if str(_SP) not in sys.path:
    sys.path.insert(0, str(_SP))

from migration.column_schema import column_kind
from migration import import_client
from migration import import_context as ctx


def _guid_norm(g: str) -> str:
    return (g or "").strip().strip("{}").lower()


def _source_guid_to_list_name(index_lists: list[dict]) -> dict[str, str]:
    m: dict[str, str] = {}
    for e in index_lists:
        gid = _guid_norm(str(e.get("id") or ""))
        name = (e.get("name") or "").strip()
        if gid and name:
            m[gid] = name
    return m


def _load_export_columns_by_list(root: Path, index_lists: list[dict]) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for e in index_lists:
        name = (e.get("name") or "").strip()
        rel = (e.get("exportPath") or "").strip()
        if not name or not rel:
            continue
        p = root / rel / "columns.json"
        if not p.is_file():
            continue
        cols = import_client.read_json(p)
        if isinstance(cols, list):
            out[name] = cols
    return out


def _edges_from_lookups(list_name: str, cols: list[dict], guid_to_name: dict[str, str]) -> list[tuple[str, str]]:
    """
    Return edges (prerequisite, dependent): prerequisite list must have items imported before dependent.

    If list A has a lookup to list B, edge is (B, A).
    """
    edges: list[tuple[str, str]] = []
    for col in cols:
        if column_kind(col) != "lookup":
            continue
        lu = col.get("lookup") or {}
        if col.get("readOnly") and lu.get("primaryLookupColumnId"):
            continue
        tid = _guid_norm(str(lu.get("listId") or ""))
        if not tid:
            continue
        prereq = guid_to_name.get(tid)
        if not prereq or prereq == list_name:
            continue
        edges.append((prereq, list_name))
    return edges


def topological_sort(nodes: set[str], edges: list[tuple[str, str]]) -> tuple[list[str], list[list[str]]]:
    """Returns (ordered, cycles_as_lists)."""
    adj: dict[str, set[str]] = defaultdict(set)
    indeg: dict[str, int] = defaultdict(int)
    for u, v in edges:
        if u not in nodes or v not in nodes:
            continue
        if v not in adj[u]:
            adj[u].add(v)
            indeg[v] += 1
    for n in nodes:
        indeg.setdefault(n, 0)

    q = deque(sorted([n for n in nodes if indeg[n] == 0]))
    order: list[str] = []
    while q:
        n = q.popleft()
        order.append(n)
        for v in sorted(adj[n]):
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)

    if len(order) != len(nodes):
        leftover = sorted(nodes - set(order))
        return order + leftover, [leftover]

    return order, []


def run_report() -> dict[str, object]:
    ctx.load_migration_target_env()
    root = ctx.migration_export_root()
    idx_path = import_client.lists_index_path()
    if not idx_path.is_file():
        raise FileNotFoundError(f"Missing export index: {idx_path}")

    idx = import_client.read_json(idx_path)
    lists_meta = idx.get("lists") or []
    guid_to_name = _source_guid_to_list_name(lists_meta)
    cols_by_list = _load_export_columns_by_list(root, lists_meta)

    all_names = {(e.get("name") or "").strip() for e in lists_meta if (e.get("name") or "").strip()}
    edges: list[tuple[str, str]] = []
    edge_detail: list[dict[str, str]] = []

    for list_name, cols in cols_by_list.items():
        for u, v in _edges_from_lookups(list_name, cols, guid_to_name):
            edges.append((u, v))
            edge_detail.append({"prerequisite": u, "dependent": v, "fromList": list_name})

    order, cycles = topological_sort(all_names, edges)

    report: dict[str, object] = {
        "order": order,
        "edgeCount": len(edges),
        "edges": edge_detail[:500],
        "cycles": cycles,
        "notes": [
            "Order is for list *item* import: prerequisite lists appear before lists that lookup into them.",
            "Lists with no lookup dependencies appear early (before dependents in topo wave); ties are alphabetical.",
        ],
    }
    import_client.write_migration_reports_json("list_import_order", report)
    return report


def ordered_export_names(all_meta: list[dict]) -> list[str]:
    """Load order from reports/list_import_order.json if present; else alphabetical."""
    p = ctx.reports_dir() / "list_import_order.json"
    names = [(e.get("name") or "").strip() for e in all_meta if (e.get("name") or "").strip()]
    if not p.is_file():
        return sorted(names)
    data = import_client.read_json(p)
    order = data.get("order") or []
    if not isinstance(order, list):
        return sorted(names)
    seen = set(order)
    tail = sorted([n for n in names if n not in seen])
    return [x for x in order if x in names] + tail


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    r = run_report()
    print(f"list_import_order: lists={len(r['order'])} edges={r['edgeCount']} cycles={len(r['cycles'])}")


if __name__ == "__main__":
    main()
