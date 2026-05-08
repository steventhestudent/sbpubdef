"""
Export site navigation ("header links") best-effort.

SharePoint navigation is not consistently available via Microsoft Graph.
This script uses SharePoint REST `/_api/web/navigation/...` and therefore may fail
in tenants that return `401 Unsupported app only token` for REST with app-only auth.

Output:
- navigation/topNavigationBar.json
- navigation/quickLaunch.json
- navigation/notes.json
"""

from __future__ import annotations

import logging
import sys
import os
from pathlib import Path
from typing import Any

_SP = Path(__file__).resolve().parents[1]
if str(_SP) not in sys.path:
    sys.path.insert(0, str(_SP))

from migration import config
from migration import sp_client

logger = logging.getLogger(__name__)


def _rest_value(data: dict[str, Any] | None) -> list[dict[str, Any]] | None:
    if not data or not isinstance(data, dict):
        return None
    if isinstance(data.get("value"), list):
        return list(data["value"])
    # Some REST responses use "d": {"results": [...]}
    d = data.get("d")
    if isinstance(d, dict) and isinstance(d.get("results"), list):
        return list(d["results"])
    return None


def run_export() -> dict[str, Any]:
    sp_client.authenticate()
    # Site id is optional here; navigation export is SharePoint REST-based.
    site_id = ""

    out_root = config.migration_output_dir()
    nav_dir = out_root / "navigation"
    nav_dir.mkdir(parents=True, exist_ok=True)

    tenant = (os.getenv("TENANT_NAME") or "").strip()
    if not tenant:
        raise RuntimeError("TENANT_NAME missing (needed for SharePoint REST navigation export)")
    site_abs = sp_client.sp_site_absolute_url(tenant, config.migration_site_name())
    notes: dict[str, Any] = {"site": site_abs, "siteId": site_id, "errors": []}

    # Expand children to preserve hierarchy.
    top = sp_client.sp_rest_get(
        site_abs,
        "/_api/web/navigation/TopNavigationBar?$expand=Children",
        log_failures=False,
    )
    quick = sp_client.sp_rest_get(
        site_abs,
        "/_api/web/navigation/QuickLaunch?$expand=Children",
        log_failures=False,
    )

    top_val = _rest_value(top)
    quick_val = _rest_value(quick)

    if top_val is None:
        notes["errors"].append("topNavigationBar_unavailable (SharePoint REST may reject app-only tokens)")
        top_val = []
    if quick_val is None:
        notes["errors"].append("quickLaunch_unavailable (SharePoint REST may reject app-only tokens)")
        quick_val = []

    sp_client.export_json(nav_dir / "topNavigationBar.json", {"value": top_val})
    sp_client.export_json(nav_dir / "quickLaunch.json", {"value": quick_val})
    sp_client.export_json(nav_dir / "notes.json", notes)
    return {"exported": True, "errors": notes["errors"]}


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    r = run_export()
    errs = r.get("errors") or []
    if errs:
        logger.warning("export_navigation: completed with warnings: %s", errs)
    print("export_navigation: wrote navigation/*.json")


if __name__ == "__main__":
    main()

