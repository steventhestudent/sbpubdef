"""
Export modern SharePoint pages via Microsoft Graph (beta).

Writes:
  migration_output/pages/index.json          — page list / summary
  migration_output/pages/<safe-title>.json   — per-page payload when detail fetch succeeds

API notes (limitations called out in exported JSON):
- Uses Graph **beta** `GET /sites/{site-id}/pages` — schema may change; app registration must allow beta usage.
- Canvas layout / web parts: attempted via `$expand=canvasLayout` on list and/or single-page GET.
  Not all tenants return full web part property bags; SPFx custom properties may be incomplete.
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
            detail_url = f"{sp_client.GRAPH_BETA}/sites/{site}/pages/{pid}"
            # Web part internals may not support $expand on all tenants; canvasLayout is the main hook.
            dr = sp_client.graph_request(
                "GET",
                detail_url,
                params={"$expand": "canvasLayout"},
            )
            if dr.status_code < 300:
                sp_client.export_json(pages_dir / f"{file_base}.json", dr.json())
            else:
                sp_client.export_json(
                    pages_dir / f"{file_base}.error.json",
                    {"status": dr.status_code, "body": dr.text[:8000], "id": pid},
                )
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
