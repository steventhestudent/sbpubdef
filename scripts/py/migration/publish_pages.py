"""
Publish/check-in modern pages created from the export bundle (target tenant).

Uses Graph v1.0 typed endpoint:
  POST /sites/{siteId}/pages/{pageId}/microsoft.graph.sitePage/publish

Writes `reports/page_publish_results.json`.
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path
from typing import Any

_SP = Path(__file__).resolve().parents[1]
if str(_SP) not in sys.path:
    sys.path.insert(0, str(_SP))

from migration import import_client
from migration import import_context as ctx
from migration import sp_client

logger = logging.getLogger(__name__)


def _safe_page_name(name: str) -> str:
    n = (name or "").strip()
    if not n:
        return ""
    if not n.lower().endswith(".aspx"):
        n = f"{n}.aspx"
    return n


def _export_page_names() -> list[str]:
    pages_dir = ctx.migration_export_root() / "pages"
    out: list[str] = []
    for fp in sorted(pages_dir.glob("*.json")):
        if fp.name == "index.json" or ".error" in fp.name or ".partial" in fp.name:
            continue
        try:
            page = import_client.read_json(fp)
        except Exception:
            continue
        name = _safe_page_name(str(page.get("name") or fp.stem))
        if name:
            out.append(name)
    return sorted(set(out))


def _list_target_pages(site_id: str) -> list[dict[str, Any]]:
    # Prefer v1.0; if a tenant lacks it, a follow-up tweak may be needed.
    url = f"{sp_client.GRAPH_V1}/sites/{site_id}/pages"
    return sp_client.graph_get_all(url, params={"$top": "200"})  # type: ignore[arg-type]


def _publish(site_id: str, page_id: str) -> tuple[bool, str]:
    url = f"{sp_client.GRAPH_V1}/sites/{site_id}/pages/{page_id}/microsoft.graph.sitePage/publish"
    r = sp_client.graph_post(url, json_body={})
    if r.status_code < 300:
        return True, ""
    return False, r.text[:1200]


def run_import() -> dict[str, Any]:
    ctx.load_migration_target_env()
    sp_client.authenticate()
    site_id = import_client.target_site_id()

    wanted = set(_export_page_names())
    target_pages = _list_target_pages(site_id)

    by_name: dict[str, dict[str, Any]] = {}
    for p in target_pages:
        n = str(p.get("name") or "").strip()
        if n:
            by_name[n] = p

    results: list[dict[str, Any]] = []
    for name in sorted(wanted):
        p = by_name.get(name)
        if not p:
            results.append({"name": name, "status": "missing_in_target"})
            continue
        page_id = str(p.get("id") or "")
        before = p.get("publishingState")
        ok, err = _publish(site_id, page_id) if page_id else (False, "missing_page_id")

        after: Any = None
        web_url = str(p.get("webUrl") or "")
        if ok and page_id:
            r2 = sp_client.graph_request("GET", f"{sp_client.GRAPH_V1}/sites/{site_id}/pages/{page_id}")
            if r2.status_code < 300:
                data = r2.json()
                after = data.get("publishingState")
                if data.get("webUrl"):
                    web_url = str(data.get("webUrl"))

        results.append(
            {
                "name": name,
                "pageId": page_id,
                "webUrl": web_url,
                "publishingStateBefore": before,
                "published": ok,
                "publishingStateAfter": after,
                "endpoint": "POST /sites/{siteId}/pages/{pageId}/microsoft.graph.sitePage/publish",
                "error": err,
            }
        )

    report = {
        "targetSite": ctx.migration_target_site_name(),
        "wantedCount": len(wanted),
        "foundCount": sum(1 for r in results if r.get("status") != "missing_in_target"),
        "publishedCount": sum(1 for r in results if r.get("published") is True),
        "results": results,
    }
    import_client.write_migration_reports_json("page_publish_results", report)
    return report


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    r = run_import()
    print(f"publish_pages: wanted={r['wantedCount']} published={r['publishedCount']}")


if __name__ == "__main__":
    main()

