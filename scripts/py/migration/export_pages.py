"""
Export modern SharePoint pages via Microsoft Graph (beta).

Writes:
  migration_output/pages/index.json          — page list / summary
  migration_output/pages/<safe-title>.json   — per-page payload when detail fetch succeeds

API notes (limitations called out in exported JSON):
- Uses Graph **beta** `GET /sites/{site-id}/pages` — schema may change; app registration must allow beta usage.
- Per-page detail: Graph sometimes rejects `$expand=canvasLayout` with “property … on baseSitePage”
  even when the path includes `/microsoft.graph.sitePage` (OData parser quirk). This exporter loads
  `.../pages/{id}/microsoft.graph.sitePage` **without** expand, then loads **canvasLayout** via
  `.../microsoft.graph.sitePage/canvasLayout` and merges it into the saved JSON when that succeeds.
- Web part property bags may still be incomplete; SPFx custom data is not guaranteed.
- Classic wiki pages / Web Part Pages in non-site-pages libraries are **not** enumerated here.
  Use export_libraries.py on the "Site Pages" / "Pages" library as files if needed.

If beta pages API returns 403/404, index.json will contain the error body for diagnosis.
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

_PAGE_ACCEPT = {"Accept": "application/json;odata.metadata=minimal"}


def _save_page_detail(site: str, pid: str, pages_dir: Path, file_base: str) -> None:
    """
    Fetch page JSON without fragile $expand=canvasLayout on the main GET (Graph may still type the
    node as baseSitePage for expand parsing). Merge layout from .../sitePage/canvasLayout when available.
    """
    site_page = f"{sp_client.GRAPH_BETA}/sites/{site}/pages/{pid}/microsoft.graph.sitePage"
    base = f"{sp_client.GRAPH_BETA}/sites/{site}/pages/{pid}"

    r = sp_client.graph_request("GET", site_page, extra_headers=_PAGE_ACCEPT)
    if r.status_code >= 300:
        r = sp_client.graph_request("GET", base, extra_headers=_PAGE_ACCEPT)
        if r.status_code < 300:
            sp_client.export_json(pages_dir / f"{file_base}.json", r.json())
            return
        sp_client.export_json(
            pages_dir / f"{file_base}.error.json",
            {"status": r.status_code, "body": r.text[:8000], "id": pid},
        )
        return

    payload = r.json()
    cl_r = sp_client.graph_request(
        "GET",
        f"{site_page}/canvasLayout",
        extra_headers=_PAGE_ACCEPT,
    )
    if cl_r.status_code < 300:
        payload["canvasLayout"] = cl_r.json()
    else:
        logger.info(
            "canvasLayout segment HTTP %s for page id=%s (page metadata still exported).",
            cl_r.status_code,
            pid,
        )

    sp_client.export_json(pages_dir / f"{file_base}.json", payload)


def run_export(*, site_id: str | None = None) -> Path:
    sp_client.authenticate()
    out = migration_output_dir()
    pages_dir = out / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)

    site = site_id or sp_client.get_site_id(migration_site_name())
    list_url = f"{sp_client.GRAPH_BETA}/sites/{site}/pages"

    pages: list = []
    list_status = 0
    list_error_text = ""
    for params in (
        {"$expand": "canvasLayout", "$top": "100"},
        {"$top": "100"},
    ):
        acc: list = []
        next_url: str | None = list_url
        first = True
        failed = False
        while next_url:
            r = sp_client.graph_request("GET", next_url, params=params if first else None)
            first = False
            list_status = r.status_code
            if r.status_code >= 300:
                list_error_text = r.text
                failed = True
                break
            data = r.json()
            acc.extend(data.get("value", []))
            next_url = data.get("@odata.nextLink")
        if not failed:
            pages = acc
            break

    index_payload: dict = {"siteId": site, "betaListStatus": list_status}
    if list_status >= 300:
        index_payload["errorBody"] = (list_error_text or "")[:8000]
        sp_client.export_json(pages_dir / "index.json", index_payload)
        logger.warning("Beta pages list failed: %s", list_status)
        return pages_dir / "index.json"

    index_payload["pageCount"] = len(pages)

    for p in pages:
        pid = p.get("id")
        title = p.get("title") or p.get("name") or str(pid)
        safe = sp_client.sanitize_path_segment(title)[:100]
        frag = (str(pid).replace("-", "")[-12:]) if pid else "noid"
        file_base = f"{safe}_{frag}"[:200]
        if pid:
            _save_page_detail(site, str(pid), pages_dir, file_base)
        else:
            sp_client.export_json(pages_dir / f"{file_base}.partial.json", p)

    sp_client.export_json(pages_dir / "index.json", index_payload)
    logger.info("Pages export finished (%d entries)", len(pages))
    return pages_dir / "index.json"


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    ap = argparse.ArgumentParser()
    ap.add_argument("--site-id")
    args = ap.parse_args()
    run_export(site_id=args.site_id)
    print("export_pages: done.")


if __name__ == "__main__":
    main()
