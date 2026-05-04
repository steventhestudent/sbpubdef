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
import os
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

    site_name = migration_site_name()
    site = site_id or sp_client.get_site_id(site_name)
    tenant = (os.getenv("TENANT_NAME") or "").strip()
    site_url = sp_client.sp_site_absolute_url(tenant, site_name) if tenant else ""

    # Graph `.../lists/{id}/views` is missing on many SharePoint sites ("segment 'views'").
    # Probe once; then use SharePoint REST /_api/web/lists(guid'...')/views when sharePointIds.listId exists.
    graph_views_ok: bool | None = None
    rest_views_unavailable_logged = False

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
        views_source = "none"

        if graph_views_ok is not False:
            views_url = f"{sp_client.GRAPH_V1}/sites/{site}/lists/{list_id}/views"
            vr = sp_client.graph_request("GET", views_url, params={"$top": "200"})
            if vr.status_code < 300:
                graph_views_ok = True
                d0 = vr.json()
                views.extend(d0.get("value", []))
                next_link = d0.get("@odata.nextLink")
                while next_link:
                    r2 = sp_client.graph_request("GET", next_link)
                    if r2.status_code >= 300:
                        break
                    d2 = r2.json()
                    views.extend(d2.get("value", []))
                    next_link = d2.get("@odata.nextLink")
                views_source = "microsoftGraph"
            else:
                if graph_views_ok is None:
                    graph_views_ok = False
                    logger.info(
                        "Graph list views not available for this site (HTTP %s); "
                        "using SharePoint REST for views when list GUID is present.",
                        vr.status_code,
                    )

        if not views and site_url:
            sp_ids = detail.get("sharePointIds") or {}
            list_guid = (sp_ids.get("listId") or "").strip()
            if list_guid:
                rest_views = sp_client.list_views_via_sharepoint_rest(site_url, list_guid)
                if rest_views is not None:
                    views = rest_views
                    views_source = "sharePointRest"
                elif not rest_views_unavailable_logged:
                    rest_views_unavailable_logged = True
                    logger.warning(
                        "SharePoint REST list views failed (e.g. 401 app-only). "
                        "Views will be empty unless you use delegated auth or a token accepted by SPO REST."
                    )

        sub = lists_root / _safe_list_dir_name(display, list_id)
        sub.mkdir(parents=True, exist_ok=True)
        sp_client.export_json(sub / "list.json", detail)
        # Full Graph column definitions; `name` is the internal column name (preserve typos).
        sp_client.export_json(sub / "columns.json", cols)
        sp_client.export_json(
            sub / "views.json",
            {
                "views": views,
                "source": views_source,
                "note": (
                    "source=microsoftGraph: from Graph /lists/{id}/views. "
                    "source=sharePointRest: from /_api/web/lists(guid'...')/views. "
                    "source=none: neither worked (Graph segment missing and/or REST rejected token)."
                ),
            },
        )

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
