"""
Export site-level metadata from Microsoft Graph.

Writes:
  migration_output/site/site.json

Uses GET https://graph.microsoft.com/v1.0/sites/{site-id}
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

_SP_PY = Path(__file__).resolve().parents[1]
if str(_SP_PY) not in sys.path:
    sys.path.insert(0, str(_SP_PY))

from migration.config import migration_output_dir
from migration import sp_client

logger = logging.getLogger(__name__)


def run_export(*, site_id: str | None = None, site_name: str | None = None) -> Path:
    sp_client.authenticate()
    out = migration_output_dir()
    site_dir = out / "site"
    site_dir.mkdir(parents=True, exist_ok=True)

    if not site_id:
        from migration.config import migration_site_name

        site_name = site_name or migration_site_name()
        site_id = sp_client.get_site_id(site_name)

    url = f"{sp_client.GRAPH_V1}/sites/{site_id}"
    params = {
        "$select": "id,name,displayName,description,webUrl,createdDateTime,siteCollection,lastModifiedDateTime",
    }
    r = sp_client.graph_request("GET", url, params=params)
    if r.status_code >= 300:
        raise RuntimeError(f"Graph site metadata failed: {r.status_code} {r.text}")

    payload = r.json()
    sp_client.export_json(site_dir / "site.json", payload)
    logger.info("Wrote %s", site_dir / "site.json")
    return site_dir / "site.json"


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    p = argparse.ArgumentParser(description="Export SharePoint site metadata (Graph).")
    p.add_argument("--site-id", help="Graph site id (skips name lookup).")
    p.add_argument("--site-name", help="Site path name (overrides MIGRATION_SITE_NAME / HUB_NAME).")
    args = p.parse_args()
    run_export(site_id=args.site_id, site_name=args.site_name)
    print("export_site: done.")


if __name__ == "__main__":
    main()
