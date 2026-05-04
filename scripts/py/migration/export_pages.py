"""
Export modern SharePoint pages via Microsoft Graph (beta).

Writes:
  migration_output/pages/index.json          — page list / summary
  migration_output/pages/<safe-title>.json   — per-page payload when detail fetch succeeds

API notes (limitations called out in exported JSON):
- Uses Graph **beta** `GET /sites/{site-id}/pages` — schema may change; app registration must allow beta usage.
- Canvas: tries **beta and v1.0**, nested `$expand=canvasLayout(...)` on the sitePage URL, plain
  `/canvasLayout` with expands, and `/canvasLayout/horizontalSections`. If Graph still returns 400 for
  all strategies, rely on **Site Pages `.aspx` files** from `export_libraries` (they contain client-side page JSON).
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

# Nested $expand on sitePage sometimes succeeds when GET .../canvasLayout returns 400 (service OData quirks).
_CANVAS_EXPAND_TRIES = [
    "canvasLayout($expand=horizontalSections($expand=columns($expand=webparts)))",
    "canvasLayout($expand=horizontalSections($expand=columns))",
    "canvasLayout($expand=horizontalSections)",
    "canvasLayout",
]

_CL_SEG_EXPAND_TRIES = [
    {"$expand": "horizontalSections($expand=columns($expand=webparts))"},
    {"$expand": "horizontalSections($expand=columns)"},
    {"$expand": "horizontalSections"},
    None,
]


def _try_extract_canvas_from_page_json(data: dict) -> dict | None:
    cl = data.get("canvasLayout")
    if isinstance(cl, dict) and cl:
        return cl
    return None


def _fetch_canvas_layout(site: str, pid: str) -> tuple[dict | None, str | None]:
    """
    Return (canvasLayout dict or None, first_error_snippet for diagnostics).
    Tries beta + v1.0, $expand chains on sitePage, /canvasLayout variants, and horizontalSections collection.
    """
    first_err: str | None = None
    bases = (sp_client.GRAPH_BETA, sp_client.GRAPH_V1)

    for graph_base in bases:
        site_page = f"{graph_base}/sites/{site}/pages/{pid}/microsoft.graph.sitePage"

        for ex in _CANVAS_EXPAND_TRIES:
            r = sp_client.graph_request(
                "GET",
                site_page,
                params={"$expand": ex},
                extra_headers=_PAGE_ACCEPT,
            )
            if r.status_code < 300:
                cl = _try_extract_canvas_from_page_json(r.json())
                if cl:
                    return cl, None
            elif first_err is None:
                first_err = r.text[:400]

        for params in _CL_SEG_EXPAND_TRIES:
            r = sp_client.graph_request(
                "GET",
                f"{site_page}/canvasLayout",
                params=params,
                extra_headers=_PAGE_ACCEPT,
            )
            if r.status_code < 300:
                return r.json(), None
            elif first_err is None:
                first_err = r.text[:400]

        r = sp_client.graph_request(
            "GET",
            f"{site_page}/canvasLayout/horizontalSections",
            extra_headers=_PAGE_ACCEPT,
        )
        if r.status_code < 300:
            data = r.json()
            rows = data.get("value")
            if isinstance(rows, list):
                return {"horizontalSections": rows}, None
        elif first_err is None:
            first_err = r.text[:400]

    return None, first_err


def _merge_canvas(payload: dict, site: str, pid: str, stats: dict) -> None:
    canvas, err_snip = _fetch_canvas_layout(site, pid)
    if canvas:
        payload["canvasLayout"] = canvas
        stats["canvas_ok"] += 1
        return
    stats["canvas_missing"] += 1
    if err_snip and not stats.get("_logged_canvas_err"):
        stats["_logged_canvas_err"] = 1
        logger.warning(
            "Could not load canvasLayout for any page (Graph). Example error: %s — "
            "full markup may still exist under libraries/.../SitePages/*.aspx from export_libraries.",
            err_snip[:300],
        )


def _save_page_detail(site: str, pid: str, pages_dir: Path, file_base: str, *, stats: dict) -> None:
    """
    Fetch page metadata, then best-effort canvasLayout via several Graph strategies.
    """
    site_page = f"{sp_client.GRAPH_BETA}/sites/{site}/pages/{pid}/microsoft.graph.sitePage"
    base = f"{sp_client.GRAPH_BETA}/sites/{site}/pages/{pid}"

    r = sp_client.graph_request("GET", site_page, extra_headers=_PAGE_ACCEPT)
    if r.status_code >= 300:
        r = sp_client.graph_request("GET", base, extra_headers=_PAGE_ACCEPT)
        if r.status_code < 300:
            payload = r.json()
            _merge_canvas(payload, site, pid, stats)
            sp_client.export_json(pages_dir / f"{file_base}.json", payload)
            return
        sp_client.export_json(
            pages_dir / f"{file_base}.error.json",
            {"status": r.status_code, "body": r.text[:8000], "id": pid},
        )
        return

    payload = r.json()
    _merge_canvas(payload, site, pid, stats)

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

    stats: dict = {"canvas_ok": 0, "canvas_missing": 0}
    for p in pages:
        pid = p.get("id")
        title = p.get("title") or p.get("name") or str(pid)
        safe = sp_client.sanitize_path_segment(title)[:100]
        frag = (str(pid).replace("-", "")[-12:]) if pid else "noid"
        file_base = f"{safe}_{frag}"[:200]
        if pid:
            _save_page_detail(site, str(pid), pages_dir, file_base, stats=stats)
        else:
            sp_client.export_json(pages_dir / f"{file_base}.partial.json", p)

    index_payload["canvasLayoutStats"] = {
        "withCanvasLayout": stats["canvas_ok"],
        "withoutCanvasLayout": stats["canvas_missing"],
    }
    sp_client.export_json(pages_dir / "index.json", index_payload)
    logger.info(
        "Pages export finished (%d entries, canvasLayout on %d pages).",
        len(pages),
        stats["canvas_ok"],
    )
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
