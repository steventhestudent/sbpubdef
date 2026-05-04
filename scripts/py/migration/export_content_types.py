"""
Export site content types and associated columns (Microsoft Graph).

Writes:
  migration_output/content_types/site_content_types.json
  migration_output/content_types/columns_<contentTypeId_safe>.json  (one file per type, when available)

Graph: `GET /sites/{site-id}/contentTypes` with pagination.

Per-type columns (when supported):
  `GET /sites/{site-id}/contentTypes/{contentType-id}/columns`

Limitations:
- Inherits / publishing features may add types not visible to Graph.
- List-scoped content types are not duplicated here unless you extend this script
  (see `GET .../lists/{list-id}/contentTypes`).
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path
from urllib.parse import quote

_SP_PY = Path(__file__).resolve().parents[1]
if str(_SP_PY) not in sys.path:
    sys.path.insert(0, str(_SP_PY))

from migration.config import migration_output_dir, migration_site_name
from migration import sp_client

logger = logging.getLogger(__name__)


def run_export(*, site_id: str | None = None) -> Path:
    sp_client.authenticate()
    out = migration_output_dir()
    ct_dir = out / "content_types"
    ct_dir.mkdir(parents=True, exist_ok=True)

    site = site_id or sp_client.get_site_id(migration_site_name())
    base = f"{sp_client.GRAPH_V1}/sites/{site}/contentTypes"
    types_list = sp_client.graph_get_all(base, params={"$top": "100"})
    sp_client.export_json(ct_dir / "site_content_types.json", {"value": types_list, "count": len(types_list)})

    for ct in types_list:
        cid = ct.get("id")
        if not cid:
            continue
        safe = sp_client.sanitize_path_segment(cid.replace("0x", ""))[:80]
        cid_enc = quote(str(cid), safe="")
        col_url = f"{sp_client.GRAPH_V1}/sites/{site}/contentTypes/{cid_enc}/columns"
        cr = sp_client.graph_request("GET", col_url)
        if cr.status_code < 300:
            sp_client.export_json(ct_dir / f"columns_{safe}.json", cr.json())
        else:
            sp_client.export_json(
                ct_dir / f"columns_{safe}.error.json",
                {"contentTypeId": cid, "status": cr.status_code, "body": cr.text[:4000]},
            )

    logger.info("Content types: %d types processed", len(types_list))
    return ct_dir / "site_content_types.json"


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    ap = argparse.ArgumentParser()
    ap.add_argument("--site-id")
    args = ap.parse_args()
    run_export(site_id=args.site_id)
    print("export_content_types: done.")


if __name__ == "__main__":
    main()
