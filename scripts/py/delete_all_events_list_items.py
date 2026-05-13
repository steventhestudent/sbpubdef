"""
Delete every item in the SharePoint Events list (Site Contents → Events).

Uses Microsoft Graph (same auth as migration scripts). Requires app permissions
that include Sites.Selected or Sites.ReadWrite.All as appropriate for your tenant.

Default is dry-run (counts items, deletes nothing). Pass --execute to delete.

Env (via config/env.public, .env.public.dev, .env.dev loaded by local_upload):
  MIGRATION_SITE_NAME or HUB_NAME — site path segment (e.g. PD-Intranet)
  TENANT_NAME, AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET

Optional:
  EVENTS_LIST_NAME — Graph list `name` (default: Events)
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

import requests

_SP_PY = Path(__file__).resolve().parent
if str(_SP_PY) not in sys.path:
    sys.path.insert(0, str(_SP_PY))

from azure_function.sbpubdef import local_upload as lu
from migration.config import list_items_page_size, migration_site_name
from migration import sp_client

GRAPH_V1 = "https://graph.microsoft.com/v1.0"


def _delete_item(site_id: str, list_id: str, item_id: str) -> None:
    url = f"{GRAPH_V1}/sites/{site_id}/lists/{list_id}/items/{item_id}"
    last: requests.Response | None = None
    for attempt in range(6):
        resp = requests.delete(url, headers=lu.session_headers, timeout=120)
        last = resp
        if resp.status_code == 204:
            return
        if resp.status_code in (429, 500, 502, 503, 504):
            time.sleep(min(8.0, 0.5 * (2**attempt)))
            continue
        raise RuntimeError(f"Graph DELETE item failed: {resp.status_code} {resp.text}")
    raise RuntimeError(f"Graph DELETE item failed after retries: {last.status_code if last else 'n/a'} {last.text if last else ''}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--list-name",
        default=os.getenv("EVENTS_LIST_NAME", "Events"),
        help="SharePoint list Graph `name` (default: Events or EVENTS_LIST_NAME).",
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually delete items. Without this flag, only reports how many would be deleted.",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Print each deleted item id.",
    )
    args = parser.parse_args()

    sp_client.authenticate()
    site_name = migration_site_name()
    site_id = lu.get_site_id(site_name)
    list_id = lu.get_list_id(site_id, args.list_name)
    if not list_id:
        print(
            f"No list with Graph name {args.list_name!r} on site {site_name!r}. "
            "Check Site Contents list URL slug or set EVENTS_LIST_NAME / --list-name.",
            file=sys.stderr,
        )
        return 1

    page_size = list_items_page_size()

    n = 0
    if not args.execute:
        for _ in sp_client.iterate_list_items(site_id, list_id, page_size=page_size):
            n += 1
        print(f"Dry run: {n} item(s) in list {args.list_name!r} on {site_name!r}. Re-run with --execute to delete them.")
        return 0

    for item in sp_client.iterate_list_items(site_id, list_id, page_size=page_size):
        item_id = str(item.get("id") or "")
        if not item_id:
            continue
        _delete_item(site_id, list_id, item_id)
        n += 1
        if args.verbose:
            print(f"deleted id={item_id}")

    print(f"Deleted {n} item(s) from list {args.list_name!r} on site {site_name!r}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
