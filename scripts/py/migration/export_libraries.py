"""
Download all files from document libraries (Microsoft Graph drives).

Writes:
  migration_output/libraries/<drive-name>/files/<relative-path>
  migration_output/libraries/<drive-name>/files/<relative-path>.metadata.json

Each .metadata.json contains the Graph driveItem JSON for that file (ids, webUrl, file hashes, etc.).

Folder structure under `files/` mirrors the library. Empty folders may not appear (Graph lists only
folders that exist as items when encountered during traversal).

Rerunnable: re-downloads overwrite existing files.
"""

from __future__ import annotations

import argparse
import logging
import sys
from collections import deque
from pathlib import Path
from typing import Any

_SP_PY = Path(__file__).resolve().parents[1]
if str(_SP_PY) not in sys.path:
    sys.path.insert(0, str(_SP_PY))

from migration.config import migration_output_dir, migration_site_name
from migration import sp_client

logger = logging.getLogger(__name__)


def _walk_files(site_id: str, drive_id: str) -> list[tuple[str, dict[str, Any]]]:
    """Return (relative_path, driveItem) for non-folder items."""
    out: list[tuple[str, dict[str, Any]]] = []
    q: deque[tuple[str | None, str]] = deque()
    q.append((None, ""))
    while q:
        item_id, rel_path = q.popleft()
        if item_id is None:
            url = f"{sp_client.GRAPH_V1}/sites/{site_id}/drives/{drive_id}/root/children"
        else:
            url = f"{sp_client.GRAPH_V1}/sites/{site_id}/drives/{drive_id}/items/{item_id}/children"
        try:
            it_iter = sp_client.graph_get_paginated(url, params={"$top": "200"})
        except Exception as e:
            logger.warning("Could not list children for %s: %s", rel_path or "/", e)
            continue
        for it in it_iter:
            name = it.get("name") or "unnamed"
            sub = f"{rel_path}/{name}" if rel_path else name
            if it.get("folder") is not None:
                q.append((it.get("id"), sub))
            elif it.get("file") is not None:
                out.append((sub, it))
            # skip packages or oddities without file/folder
    return out


def run_export(*, site_id: str | None = None) -> Path:
    sp_client.authenticate()
    out = migration_output_dir()
    lib_root = out / "libraries"
    lib_root.mkdir(parents=True, exist_ok=True)

    site = site_id or sp_client.get_site_id(migration_site_name())
    drives = sp_client.get_site_drives(site)
    manifest: list[dict[str, Any]] = []

    for d in drives:
        drive_id = d.get("id")
        dname = d.get("name") or drive_id
        if not drive_id:
            continue
        safe = sp_client.sanitize_path_segment(dname)
        files_root = lib_root / safe / "files"
        files_root.mkdir(parents=True, exist_ok=True)

        pairs = _walk_files(site, drive_id)
        logger.info("Drive %s: %d files to download", dname, len(pairs))

        for rel, item in pairs:
            item_id = item.get("id")
            if not item_id:
                continue
            local_rel = Path(rel)
            dest_file = files_root / local_rel
            dest_file.parent.mkdir(parents=True, exist_ok=True)
            meta_path = Path(str(dest_file) + ".metadata.json")

            content_url = f"{sp_client.GRAPH_V1}/sites/{site}/drives/{drive_id}/items/{item_id}/content"
            try:
                sp_client.graph_download_to_path(content_url, dest_file)
                sp_client.export_json(meta_path, item)
            except Exception as e:
                logger.warning("Failed %s: %s", rel, e)

        manifest.append(
            {
                "driveId": drive_id,
                "name": dname,
                "driveType": d.get("driveType"),
                "webUrl": d.get("webUrl"),
                "exportPath": str((lib_root / safe).relative_to(out)),
                "fileCount": len(pairs),
            }
        )

    sp_client.export_json(lib_root / "_manifest.json", {"siteId": site, "drives": manifest})
    logger.info("Wrote library manifest")
    return lib_root / "_manifest.json"


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    ap = argparse.ArgumentParser()
    ap.add_argument("--site-id")
    args = ap.parse_args()
    run_export(site_id=args.site_id)
    print("export_libraries: done.")


if __name__ == "__main__":
    main()
