"""
Graph + SharePoint REST helpers for migration exports.

Authentication and token handling reuse `azure_function.sbpubdef.local_upload`:
  - Call `authenticate()` once per process before any API calls.
  - `session_headers` = Microsoft Graph app-only token.
  - `sharepoint_session_headers` = SharePoint resource token (when TENANT_NAME is set).

Pagination, retries, and streaming downloads follow patterns used elsewhere in this repo
(see `local_upload/__init__.py`).
"""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any, Iterator
import requests

from azure_function.sbpubdef import local_upload as lu

logger = logging.getLogger(__name__)

GRAPH_V1 = "https://graph.microsoft.com/v1.0"
GRAPH_BETA = "https://graph.microsoft.com/beta"


def graph_headers() -> dict[str, str]:
    if not lu.session_headers.get("Authorization"):
        raise RuntimeError("Graph session not initialized; call authenticate() first.")
    return lu.session_headers


def sp_headers() -> dict[str, str]:
    if not lu.sharepoint_session_headers.get("Authorization"):
        raise RuntimeError(
            "SharePoint REST token missing; set TENANT_NAME and ensure app has SharePoint permissions."
        )
    return lu.sharepoint_session_headers


def site_server_relative_url(tenant: str, site_name: str) -> str:
    return f"/sites/{site_name}"


def sp_site_absolute_url(tenant: str, site_name: str) -> str:
    return f"https://{tenant}.sharepoint.com/sites/{site_name}"


def _sleep_backoff(attempt: int) -> None:
    delay = min(8.0, 0.5 * (2**attempt))
    time.sleep(delay)


def graph_request(
    method: str,
    url: str,
    *,
    params: dict[str, Any] | None = None,
    stream: bool = False,
    json_body: Any | None = None,
    extra_headers: dict[str, str] | None = None,
) -> requests.Response:
    """Graph request with retry on 429 / 5xx."""
    headers = {**graph_headers(), **(extra_headers or {})}
    last: requests.Response | None = None
    for attempt in range(6):
        if json_body is not None:
            resp = requests.request(
                method,
                url,
                headers={**headers, "Content-Type": "application/json"},
                params=params,
                json=json_body,
                stream=stream,
                timeout=120,
            )
        else:
            resp = requests.request(method, url, headers=headers, params=params, stream=stream, timeout=120)
        last = resp
        if resp.status_code < 300:
            return resp
        if resp.status_code in (429, 500, 502, 503, 504):
            _sleep_backoff(attempt)
            continue
        return resp
    return last  # type: ignore[return-value]


def graph_get_paginated(url: str, *, params: dict[str, Any] | None = None) -> Iterator[dict[str, Any]]:
    """
    Yield each JSON object from a Graph collection, following @odata.nextLink.
    For nextLink requests, the URL is absolute — params are only used on the first request.
    """
    next_url: str | None = url
    first = True
    while next_url:
        r = graph_request("GET", next_url, params=params if first else None)
        first = False
        if r.status_code >= 300:
            logger.warning("Graph GET failed %s %s", r.status_code, r.text[:500])
            break
        data = r.json()
        for item in data.get("value", []):
            yield item
        next_url = data.get("@odata.nextLink")


def graph_get_all(url: str, *, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    return list(graph_get_paginated(url, params=params))


def graph_download_to_path(url: str, dest_path: Any) -> None:
    """Stream download (Graph file content endpoint)."""
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    r = graph_request("GET", url, stream=True)
    if r.status_code >= 300:
        raise RuntimeError(f"Download failed: {r.status_code} {r.text[:500]}")
    with open(dest_path, "wb") as f:
        for chunk in r.iter_content(chunk_size=1024 * 256):
            if chunk:
                f.write(chunk)


def sanitize_path_segment(name: str) -> str:
    """Safe folder/file segment for local filesystem (preserves readable names)."""
    if not name or name in (".", ".."):
        return "_"
    cleaned = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name).strip()
    return cleaned or "_"


def is_document_library_list(list_obj: dict[str, Any]) -> bool:
    """Heuristic: Graph list.template / baseTemplate for document libraries."""
    inner = (list_obj or {}).get("list") or {}
    t = (inner.get("template") or "").lower()
    if t == "documentlibrary":
        return True
    # Some responses expose only numeric baseTemplate (101 = document library)
    bt = inner.get("baseTemplate")
    if str(bt) == "101" or bt == 101:
        return True
    return str(bt).lower() == "documentlibrary"


def sp_rest_get(site_absolute_url: str, api_path: str) -> dict[str, Any] | None:
    """
    GET SharePoint REST (/_api/...). Returns parsed JSON or None on failure.

    Limitations: only captures what this endpoint returns; large roleassignment payloads
    may need additional expands not implemented here.
    """
    url = site_absolute_url.rstrip("/") + api_path
    try:
        headers = {
            **sp_headers(),
            "Accept": "application/json;odata=nometadata",
        }
        r = requests.get(url, headers=headers, timeout=120)
        if r.status_code >= 300:
            logger.warning("SharePoint REST GET %s -> %s %s", api_path, r.status_code, r.text[:300])
            return None
        return r.json()
    except Exception as e:
        logger.warning("SharePoint REST GET %s failed: %s", api_path, e)
        return None


def export_json(path: Any, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)


def append_jsonl(path: Any, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False, default=str) + "\n")


def iterate_list_items(
    site_id: str,
    list_id: str,
    *,
    page_size: int = 200,
    prefer_nonindexed: bool = False,
) -> Iterator[dict[str, Any]]:
    """
    Paginate GET /sites/{site-id}/lists/{list-id}/items with $expand=fields.

    Field keys in item['fields'] use SharePoint internal names as returned by Graph
    (preserve spelling such as typos in internal names).
    """
    url = f"{GRAPH_V1}/sites/{site_id}/lists/{list_id}/items"
    params: dict[str, Any] = {
        "$expand": "fields",
        "$top": str(page_size),
    }
    extra = {"Prefer": "HonorNonIndexedQueriesWarningMayFailRandomly"} if prefer_nonindexed else None
    next_url: str | None = url
    first = True
    while next_url:
        # nextLink is absolute; only pass params on first request
        r = graph_request(
            "GET",
            next_url,
            params=params if first else None,
            extra_headers=extra,
        )
        first = False
        if r.status_code >= 300:
            logger.warning(
                "list items page failed %s list_id=%s: %s",
                r.status_code,
                list_id,
                r.text[:500],
            )
            break
        data = r.json()
        for item in data.get("value", []):
            yield item
        next_url = data.get("@odata.nextLink")


#
# Re-export commonly used symbols for convenience
#
authenticate = lu.authenticate
get_site_id = lu.get_site_id
get_site_drives = lu.get_site_drives
get_list_columns = lu.get_list_columns
get_site_lists = lu.get_site_lists
odata_escape = lu.odata_escape
