"""
Shared helpers for migration import: read exports, write reports, target site resolution.

Reuses `sp_client` / `local_upload` for Graph calls after `authenticate()`.
"""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Any

import requests

from migration import import_context as ctx
from migration import sp_client

logger = logging.getLogger(__name__)


def read_json(path: Path) -> Any:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write_report(name: str, data: Any) -> Path:
    out = ctx.import_reports_dir() / f"{name}.json"
    sp_client.export_json(out, data)
    return out


def write_text_report(name: str, text: str) -> Path:
    out = ctx.import_reports_dir() / f"{name}.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    return out


def target_site_id() -> str:
    return sp_client.get_site_id(ctx.migration_target_site_name())


def lists_index_path() -> Path:
    return ctx.migration_export_root() / "lists" / "index.json"


def load_list_id_map() -> dict[str, str]:
    """Maps export list `name` (internal) -> new Graph list id after import_lists."""
    p = ctx.import_reports_dir() / "list_name_to_new_id.json"
    if not p.is_file():
        return {}
    return read_json(p)


def save_list_id_map(m: dict[str, str]) -> None:
    write_report("list_name_to_new_id", m)


def list_item_jsonl_for_export_list(list_name: str, export_list_id: str) -> Path | None:
    """Resolve list_items/*.jsonl using the same suffix convention as export_list_items."""
    suffix = export_list_id.split(",")[0][-8:] if export_list_id else ""
    folder = ctx.migration_export_root() / "list_items"
    if not folder.is_dir():
        return None
    pat = f"*_{suffix}.jsonl"
    matches = sorted(folder.glob(pat))
    if not matches:
        return None
    return matches[0]


def fields_for_graph_create(fields: dict[str, Any]) -> dict[str, Any]:
    """
    Strip Graph read-only / OData keys. Preserves internal column names exactly (e.g. Statuc).
    """
    out: dict[str, Any] = {}
    for k, v in (fields or {}).items():
        if k.startswith("@"):
            continue
        if any(k.startswith(p) for p in ("odata.", "OData_")):
            continue
        if k in ("id", "ID", "Modified", "Created", "Author", "Editor", "FileLeafRef"):
            continue
        if v is None:
            continue
        out[k] = v
    return out


def upload_drive_file_bytes(site_id: str, drive_id: str, relative_path: str, data: bytes) -> dict[str, Any] | None:
    """PUT file content to drive path (same pattern as local_upload.upload_file)."""
    p = (relative_path or "").lstrip("/").replace("//", "/")
    url = f"{sp_client.GRAPH_V1}/sites/{site_id}/drives/{drive_id}/root:/{p}:/content"
    headers = {**sp_client.graph_headers(), "Content-Type": "application/octet-stream"}
    for attempt in range(6):
        resp = requests.put(url, headers=headers, data=data, timeout=300)
        if resp.status_code < 300:
            return resp.json() if resp.content else {}
        if resp.status_code in (429, 500, 502, 503, 504):
            time.sleep(min(8.0, 0.5 * (2**attempt)))
            continue
        logger.warning("upload failed %s %s", resp.status_code, resp.text[:500])
        break
    return None
