"""
Export list items for each SharePoint list (Microsoft Graph), with pagination.

Writes one JSONL file per list:
  migration_output/list_items/<safe-name>_<listId-suffix>.jsonl

Each line is one JSON object:
  { "listId", "listName", "itemId", "webUrl", "@odata.etag", "fields": { ... } }

Field keys in `fields` use internal names as returned by Graph (including lookup *LookupId fields).

Document libraries:
  By default skipped for list-item enumeration (set MIGRATION_EXPORT_DOC_LIB_LIST_ITEMS=true to include).
  Binary files are still downloaded via export_libraries.py.

Rerunnable: overwrites each list's .jsonl on each run.
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

_SP_PY = Path(__file__).resolve().parents[1]
if str(_SP_PY) not in sys.path:
    sys.path.insert(0, str(_SP_PY))

from migration.config import (
    export_doc_library_list_items,
    list_items_page_size,
    migration_output_dir,
    migration_site_name,
)
from migration import sp_client

logger = logging.getLogger(__name__)


def _safe_name(display: str, list_id: str) -> str:
    base = sp_client.sanitize_path_segment(display or "list")
    short = list_id.split(",")[0][-8:] if list_id else "unknown"
    return f"{base}_{short}"


def run_export(*, site_id: str | None = None) -> Path:
    sp_client.authenticate()
    out = migration_output_dir()
    li_dir = out / "list_items"
    li_dir.mkdir(parents=True, exist_ok=True)

    site = site_id or sp_client.get_site_id(migration_site_name())
    raw_lists = sp_client.get_site_lists(site, include_hidden=True)
    page = list_items_page_size()
    skip_doclib = not export_doc_library_list_items()

    for lst in raw_lists:
        list_id = lst.get("id") or ""
        name = lst.get("name") or list_id
        detail_url = f"{sp_client.GRAPH_V1}/sites/{site}/lists/{list_id}"
        dr = sp_client.graph_request("GET", detail_url)
        detail = dr.json() if dr.status_code < 300 else lst
        if skip_doclib and sp_client.is_document_library_list(detail):
            logger.info("Skipping list items for document library list %s (see MIGRATION_EXPORT_DOC_LIB_LIST_ITEMS)", name)
            continue

        dest = li_dir / f"{_safe_name(name, list_id)}.jsonl"
        if dest.exists():
            dest.unlink()

        count = 0
        try:
            for item in sp_client.iterate_list_items(site, list_id, page_size=page):
                row = {
                    "listId": list_id,
                    "listName": name,
                    "itemId": item.get("id"),
                    "webUrl": item.get("webUrl"),
                    "@odata.etag": item.get("@odata.etag"),
                    "fields": item.get("fields") or {},
                }
                sp_client.append_jsonl(dest, row)
                count += 1
                if count % 500 == 0:
                    logger.info("  ... %d items for list %s", count, name)
        except Exception as e:
            logger.warning("Failed list items for %s (%s): %s", name, list_id, e)
            continue
        logger.info("Exported %d items -> %s", count, dest)

    summary = {
        "siteId": site,
        "note": "Document library lists omitted unless MIGRATION_EXPORT_DOC_LIB_LIST_ITEMS=true",
    }
    sp_client.export_json(li_dir / "_summary.json", summary)
    return li_dir


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    ap = argparse.ArgumentParser()
    ap.add_argument("--site-id")
    args = ap.parse_args()
    run_export(site_id=args.site_id)
    print("export_list_items: done.")


if __name__ == "__main__":
    main()
