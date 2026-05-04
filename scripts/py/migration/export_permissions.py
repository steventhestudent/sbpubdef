"""
Best-effort export of site permissions (Microsoft Graph + SharePoint REST).

Writes:
  migration_output/permissions/graph_site_permissions.json
  migration_output/permissions/sp_rest_sitegroups.json
  migration_output/permissions/sp_rest_roleassignments.json
  migration_output/permissions/notes.json

What is typically captured:
- **Graph** `GET /sites/{site-id}/permissions`: sharing-style permission grants (may not reflect every
  legacy SharePoint group assignment).
- **SharePoint REST** `/_api/web/sitegroups`: group titles and ids when the token can access web API.
- **SharePoint REST** `/_api/web/roleassignments`: principal role bindings (size and shape vary).

What is NOT guaranteed:
- Item-level unique permissions (would require per-list / per-item calls — not implemented).
- AD group expansion / membership.
- Classic limited-access / audience rules beyond what REST returns.

Failures are recorded in notes.json; scripts remain rerunnable.
"""

from __future__ import annotations

import argparse
import logging
import os
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
    perm_dir = out / "permissions"
    perm_dir.mkdir(parents=True, exist_ok=True)
    notes: list[str] = []

    site = site_id or sp_client.get_site_id(migration_site_name())
    tenant = (os.getenv("TENANT_NAME") or "").strip()
    site_name = migration_site_name()
    site_url = sp_client.sp_site_absolute_url(tenant, site_name) if tenant else ""

    # Graph site permissions
    url = f"{sp_client.GRAPH_V1}/sites/{site}/permissions"
    gr = sp_client.graph_request("GET", url)
    if gr.status_code < 300:
        sp_client.export_json(perm_dir / "graph_site_permissions.json", gr.json())
    else:
        notes.append(f"graph_site_permissions: HTTP {gr.status_code} {gr.text[:500]}")
        sp_client.export_json(
            perm_dir / "graph_site_permissions.error.json",
            {"status": gr.status_code, "body": gr.text[:8000]},
        )

    if not tenant:
        notes.append("TENANT_NAME missing — skipping SharePoint REST permission calls.")
    else:
        try:
            sg = sp_client.sp_rest_get(site_url, "/_api/web/sitegroups")
            if sg:
                sp_client.export_json(perm_dir / "sp_rest_sitegroups.json", sg)
            else:
                notes.append("sitegroups: empty or failed (see logs).")
        except Exception as e:
            notes.append(f"sitegroups exception: {e}")

        # Role assignments — expand may be rejected on large sites; try minimal first
        for suffix in (
            "/_api/web/roleassignments",
            "/_api/web/roleassignments?$expand=Member,RoleDefinitionBindings",
        ):
            try:
                ra = sp_client.sp_rest_get(site_url, suffix)
                if ra:
                    name = "sp_rest_roleassignments.json" if "expand" not in suffix else "sp_rest_roleassignments_expanded.json"
                    sp_client.export_json(perm_dir / name, ra)
            except Exception as e:
                notes.append(f"roleassignments {suffix}: {e}")

    sp_client.export_json(
        perm_dir / "notes.json",
        {"siteId": site, "webUrl": site_url or None, "notes": notes},
    )
    logger.info("Permissions export complete (see notes.json if partial)")
    return perm_dir / "notes.json"


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    ap = argparse.ArgumentParser()
    ap.add_argument("--site-id")
    args = ap.parse_args()
    run_export(site_id=args.site_id)
    print("export_permissions: done.")


if __name__ == "__main__":
    main()
