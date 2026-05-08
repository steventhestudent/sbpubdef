"""
Step: Promote migrated announcements to News posts.

Why:
- The Announcements web part filters to News only (PromotedState=2).
- Migrated pages can be published but still have PromotedState=0, so they never show.

What this script does (best-effort, idempotent):
- Load exported modern pages from `export/pages/*.json`
- Identify PD Announcement/news pages (contentType name or promotionKind)
- Resolve target Site Pages list item IDs by FileLeafRef
- PATCH list item fields: PromotedState=2
- Re-publish the page via Graph typed sitePage endpoint (optional but recommended)

Reports:
- `.migration_output/reports/page_promote_news_results.json`
"""

from __future__ import annotations

import json
import logging
import sys
import os
from pathlib import Path
from typing import Any

import requests

_SP = Path(__file__).resolve().parents[1]
if str(_SP) not in sys.path:
    sys.path.insert(0, str(_SP))

from migration import import_client
from migration import import_context as ctx
from migration import sp_client

logger = logging.getLogger(__name__)

_SITEPAGES_INTERNAL_NAME = "SitePages"


def _safe_page_name(name: str) -> str:
    n = (name or "").strip()
    if not n:
        return ""
    if not n.lower().endswith(".aspx"):
        n = f"{n}.aspx"
    return n


def _is_pd_announcement_page(page: dict[str, Any]) -> bool:
    ct = page.get("contentType") or {}
    ct_name = str(ct.get("name") or "").strip().lower()
    promo = str(page.get("promotionKind") or "").strip().lower()
    return ct_name in ("pd announcement", "pdannouncement") or promo == "newspost"


def _load_target_sitepages_item_ids_by_leafref(site_id: str, sitepages_list_id: str) -> dict[str, str]:
    if not sitepages_list_id:
        return {}
    url = f"{sp_client.GRAPH_V1}/sites/{site_id}/lists/{sitepages_list_id}/items"
    out: dict[str, str] = {}
    for it in sp_client.graph_get_all(
        url,
        params={
            "$top": "999",
            "$expand": "fields($select=FileLeafRef,PromotedState)",
        },
    ):
        item_id = str(it.get("id") or "").strip()
        fields = it.get("fields") or {}
        if not item_id or not isinstance(fields, dict):
            continue
        leaf = str(fields.get("FileLeafRef") or "").strip()
        if leaf:
            out[leaf] = item_id
    return out


def _load_target_page_ids_by_name(site_id: str) -> dict[str, str]:
    """
    Map page file name -> Graph page id by listing /sites/{siteId}/pages.
    """
    out: dict[str, str] = {}
    for p in sp_client.graph_get_all(f"{sp_client.GRAPH_V1}/sites/{site_id}/pages", params={"$top": "999"}):
        name = str(p.get("name") or "").strip()
        pid = str(p.get("id") or "").strip()
        if name and pid:
            out[name.lower()] = pid
    return out


def _publish(site_id: str, page_id: str) -> tuple[bool, str]:
    url = f"{sp_client.GRAPH_V1}/sites/{site_id}/pages/{page_id}/microsoft.graph.sitePage/publish"
    r = sp_client.graph_post(url, json_body={})
    if r.status_code < 300:
        return True, ""
    return False, r.text[:800]


def _sp_digest(site_absolute_url: str) -> str | None:
    """
    SharePoint REST POST often requires a request digest (`X-RequestDigest`).
    """
    try:
        url = site_absolute_url.rstrip("/") + "/_api/contextinfo"
        r = requests.post(
            url,
            headers={
                **sp_client.sp_headers(),
                "Accept": "application/json;odata=nometadata",
                "Content-Type": "application/json;odata=nometadata",
            },
            timeout=120,
        )
        if r.status_code >= 300:
            return None
        data = r.json()
        return (
            (data.get("FormDigestValue") if isinstance(data, dict) else None)
            or ((data.get("d") or {}).get("GetContextWebInformation") or {}).get("FormDigestValue")
            if isinstance(data, dict)
            else None
        )
    except Exception:
        return None


def _promote_to_news_via_rest(site_absolute_url: str, item_id: str) -> tuple[bool, str]:
    """
    POST /_api/SitePages/Pages(<itemid>)/PromoteToNews
    This is what the UI uses to set PromotedState=2.
    """
    digest = _sp_digest(site_absolute_url)
    if not digest:
        return False, "missing_request_digest"
    try:
        url = site_absolute_url.rstrip("/") + f"/_api/SitePages/Pages({item_id})/PromoteToNews"
        r = requests.post(
            url,
            headers={
                **sp_client.sp_headers(),
                "Accept": "application/json;odata=nometadata",
                "Content-Type": "application/json;odata=nometadata",
                "X-RequestDigest": digest,
            },
            timeout=120,
        )
        if r.status_code < 300:
            return True, ""
        return False, f"{r.status_code}:{r.text[:800]}"
    except Exception as e:
        return False, f"exception:{e}"


def _promote_to_news_via_graph(site_id: str, page_id: str) -> tuple[bool, str]:
    """
    Graph supports promoting a page by PATCHing `promotionKind` on the typed sitePage endpoint.
    Docs: PATCH /sites/{site-id}/pages/{page-id}/microsoft.graph.sitePage with
      { "@odata.type": "#microsoft.graph.sitePage", "promotionKind": "newsPost" }
    """
    url = f"{sp_client.GRAPH_V1}/sites/{site_id}/pages/{page_id}/microsoft.graph.sitePage"
    body = {"@odata.type": "#microsoft.graph.sitePage", "promotionKind": "newsPost"}
    r = sp_client.graph_patch(url, json_body=body)
    if r.status_code < 300:
        return True, ""
    return False, f"{r.status_code}:{r.text[:800]}"


def run_import() -> dict[str, Any]:
    ctx.load_migration_target_env()
    sp_client.authenticate()
    site_id = import_client.target_site_id()
    tenant = (os.getenv("TENANT_NAME") or "").strip()
    if not tenant:
        return {"error": "TENANT_NAME missing (needed for SharePoint REST PromoteToNews)"}
    site_abs = sp_client.sp_site_absolute_url(tenant, ctx.migration_target_site_name())
    name_map = import_client.load_list_id_map()
    sitepages_list_id = str(name_map.get(_SITEPAGES_INTERNAL_NAME) or "").strip()
    if not sitepages_list_id:
        return {"error": "missing_sitepages_list_id (run import_lists first)"}

    pages_dir = ctx.migration_export_root() / "pages"
    if not pages_dir.is_dir():
        return {"error": "no pages export directory"}

    target_item_ids = _load_target_sitepages_item_ids_by_leafref(site_id, sitepages_list_id)
    target_page_ids = _load_target_page_ids_by_name(site_id)

    results: list[dict[str, Any]] = []
    dry = ctx.migration_dry_run()

    for fp in sorted(pages_dir.glob("*.json")):
        if fp.name == "index.json" or ".error" in fp.name or ".partial" in fp.name:
            continue
        try:
            page = import_client.read_json(fp)
        except Exception:
            continue
        if not _is_pd_announcement_page(page):
            continue

        name = _safe_page_name(str(page.get("name") or fp.stem))
        if not name:
            continue

        item_id = str(target_item_ids.get(name) or "").strip()
        page_id = str(target_page_ids.get(name.lower()) or "").strip()

        row: dict[str, Any] = {
            "exportFile": fp.name,
            "name": name,
            "targetSitePagesItemId": item_id,
            "targetPageId": page_id,
            "dryRun": dry,
            "promotedStatePatched": False,
            "published": False,
            "errors": [],
        }

        if not item_id:
            row["errors"].append("missing_target_sitepages_item_id_for_leafref")
            results.append(row)
            continue

        if dry:
            row["promotedStatePatched"] = True
            row["published"] = True
            results.append(row)
            continue

        # 1) Promote to News.
        # Graph list item fields treat PromotedState as read-only; promote via Graph sitePage update.
        if page_id:
            ok_prom, perr = _promote_to_news_via_graph(site_id, page_id)
        else:
            ok_prom, perr = (False, "missing_target_page_id_for_name")
        row["promotedStatePatched"] = ok_prom
        if not ok_prom and perr:
            row["errors"].append(f"promote_to_news_failed:{perr}")

        # 2) Re-publish (optional but helps Search pick up changes)
        if page_id:
            ok_pub, perr = _publish(site_id, page_id)
            row["published"] = ok_pub
            if not ok_pub and perr:
                row["errors"].append(f"publish_failed:{perr}")
        else:
            row["errors"].append("missing_target_page_id_for_name (skipped publish)")

        results.append(row)

    out = {
        "targetSite": ctx.migration_target_site_name(),
        "dryRun": dry,
        "sitePagesListId": sitepages_list_id,
        "counts": {
            "totalConsidered": len(results),
            "promotedStatePatched": sum(1 for r in results if r.get("promotedStatePatched")),
            "published": sum(1 for r in results if r.get("published")),
            "withErrors": sum(1 for r in results if r.get("errors")),
        },
        "pages": results,
    }
    import_client.write_migration_reports_json("page_promote_news_results", out)
    return out


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    r = run_import()
    c = (r.get("counts") or {}) if isinstance(r, dict) else {}
    print(
        "promote_news_pages: considered=%s promoted=%s published=%s errors=%s"
        % (
            c.get("totalConsidered", 0),
            c.get("promotedStatePatched", 0),
            c.get("published", 0),
            c.get("withErrors", 0),
        )
    )


if __name__ == "__main__":
    main()

