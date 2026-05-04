"""
Export all lists with columns and views (Microsoft Graph).

Writes per list:
  migration_output/lists/<safe-name>_<listId-suffix>/list.json
  migration_output/lists/<...>/columns.json
  migration_output/lists/<...>/views.json  (if API returns views)

Also:
  migration_output/lists/index.json  — summary of all lists

Internal column names are taken from Graph column definitions (`name` field).
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

_SP_PY = Path(__file__).resolve().parents[1]
if str(_SP_PY) not in sys.path:
    sys.path.insert(0, str(_SP_PY))

from migration.config import migration_output_dir, migration_site_name
from migration import sp_client

logger = logging.getLogger(__name__)

def _safe_list_dir_name(display: str, list_id: str) -> str:
    base = sp_client.sanitize_path_segment(display or "list")
    short = list_id.split(",")[0][-8:] if list_id else "unknown"
    return f"{base}_{short}"


def run_export(*, site_id: str | None = None) -> Path:
    sp_client.authenticate()
    out = migration_output_dir()
    lists_root = out / "lists"
    lists_root.mkdir(parents=True, exist_ok=True)

    site = site_id or sp_client.get_site_id(migration_site_name())
    raw_lists = sp_client.get_site_lists(site, include_hidden=True)
    index: list[dict] = []

    for lst in raw_lists:
        list_id = lst.get("id") or ""
        display = lst.get("name") or list_id
        # Full list object
        detail_url = f"{sp_client.GRAPH_V1}/sites/{site}/lists/{list_id}"
        dr = sp_client.graph_request("GET", detail_url)
        detail = dr.json() if dr.status_code < 300 else lst

        cols = sp_client.get_list_columns(site, list_id)

        views: list[dict] = []
        views_url = f"{sp_client.GRAPH_V1}/sites/{site}/lists/{list_id}/views"
        try:
            for v in sp_client.graph_get_paginated(views_url):
                views.append(v)
        except Exception as e:
            logger.warning("Views export failed for list %s: %s", display, e)

        sub = lists_root / _safe_list_dir_name(display, list_id)
        sub.mkdir(parents=True, exist_ok=True)
        sp_client.export_json(sub / "list.json", detail)
        # Full Graph column definitions; `name` is the internal column name (preserve typos).
        sp_client.export_json(sub / "columns.json", cols)
        sp_client.export_json(sub / "views.json", {"views": views, "note": "Empty if Graph views API unavailable or returned no rows."})

        inner = (detail.get("list") or {})
        index.append(
            {
                "id": list_id,
                "name": detail.get("name"),
                "displayName": detail.get("displayName"),
                "listTemplate": inner.get("template"),
                "hidden": inner.get("hidden"),
                "system": lst.get("system"),
                "webUrl": detail.get("webUrl"),
                "exportPath": str(sub.relative_to(out)),
                "columnCount": len(cols),
                "viewCount": len(views),
            }
        )

    sp_client.export_json(lists_root / "index.json", {"siteId": site, "lists": index})
    logger.info("Wrote lists index with %d lists", len(index))
    return lists_root / "index.json"


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    ap = argparse.ArgumentParser()
    ap.add_argument("--site-id")
    args = ap.parse_args()
    run_export(site_id=args.site_id)
    print("export_lists: done.")


if __name__ == "__main__":
    main()
