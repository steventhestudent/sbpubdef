"""
Step 1–2: Validate connectivity and verify the target site exists.

Microsoft Graph cannot create a root site collection in an arbitrary way from a simple script;
this module verifies `GET /sites/{tenant}.sharepoint.com:/sites/{name}` and writes a report.

Run after copying `config/.env.migration.target.example` → `config/.env.migration.target`.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

_SP = Path(__file__).resolve().parents[1]
if str(_SP) not in sys.path:
    sys.path.insert(0, str(_SP))

from migration import import_client
from migration import import_context as ctx
from migration import sp_client

logger = logging.getLogger(__name__)


def run_import() -> dict:
    ctx.load_migration_target_env()
    sp_client.authenticate()
    site = ctx.migration_target_site_name()
    sid = import_client.target_site_id()
    url = f"{sp_client.GRAPH_V1}/sites/{sid}"
    r = sp_client.graph_request("GET", url, params={"$select": "id,displayName,webUrl,description"})
    ok = r.status_code < 300
    payload = r.json() if ok else {}
    report = {
        "targetSiteName": site,
        "siteId": sid,
        "reachable": ok,
        "site": payload if ok else None,
        "graphError": None if ok else {"status": r.status_code, "body": r.text[:4000]},
        "manualIfMissing": (
            "Create the SharePoint site (Communication / Team) in the admin center or via "
            "PowerShell / PnP, then re-run this script. Graph site creation from apps is limited "
            "and not implemented here."
        ),
    }
    import_client.write_report("provision_site", report)
    return report


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    r = run_import()
    print("provision_site:", "OK" if r.get("reachable") else "FAILED — see import_reports/provision_site.json")
    if not r.get("reachable"):
        sys.exit(1)


if __name__ == "__main__":
    main()
