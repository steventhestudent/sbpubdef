"""
Import site navigation ("header links") best-effort.

This script attempts to recreate navigation nodes using SharePoint REST endpoints.
Many tenants reject app-only tokens for SharePoint REST (`401 Unsupported app only token`),
so this step is best-effort and primarily produces a clear report of what would be created.

Input (from export bundle):
- navigation/topNavigationBar.json
- navigation/quickLaunch.json

Output:
- `.migration_output/import_reports/import_navigation.json`
"""

from __future__ import annotations

import json
import logging
import sys
import os
from pathlib import Path
from typing import Any

import requests

_SP = Path(__file__).resolve().parents[1]
if str(_SP) not in sys.path:
    sys.path.insert(0, str(_SP))

from migration import import_client
from migration import import_context as ctx
from migration import sp_client

logger = logging.getLogger(__name__)


def _sp_digest(site_absolute_url: str) -> str | None:
    try:
        url = site_absolute_url.rstrip("/") + "/_api/contextinfo"
        r = requests.post(
            url,
            headers={
                **sp_client.sp_headers(),
                "Accept": "application/json;odata=nometadata",
                "Content-Type": "application/json;odata=nometadata",
            },
            timeout=120,
        )
        if r.status_code >= 300:
            return None
        data = r.json()
        if isinstance(data, dict) and isinstance(data.get("FormDigestValue"), str):
            return data["FormDigestValue"]
        d = data.get("d") if isinstance(data, dict) else None
        if isinstance(d, dict):
            ci = d.get("GetContextWebInformation")
            if isinstance(ci, dict) and isinstance(ci.get("FormDigestValue"), str):
                return ci["FormDigestValue"]
        return None
    except Exception:
        return None


def _post_nav_node(
    site_absolute_url: str,
    *,
    location: str,
    title: str,
    url: str,
    digest: str,
) -> tuple[bool, str]:
    """
    POST /_api/web/navigation/{TopNavigationBar|QuickLaunch}
    Body uses SP.NavigationNodeCreationInformation.
    """
    endpoint = f"/_api/web/navigation/{location}"
    full = site_absolute_url.rstrip("/") + endpoint
    body = {
        "__metadata": {"type": "SP.NavigationNodeCreationInformation"},
        "Title": title,
        "Url": url,
        "AsLastNode": True,
    }
    r = requests.post(
        full,
        headers={
            **sp_client.sp_headers(),
            "Accept": "application/json;odata=nometadata",
            "Content-Type": "application/json;odata=nometadata",
            "X-RequestDigest": digest,
        },
        json=body,
        timeout=120,
    )
    if r.status_code < 300:
        return True, ""
    return False, f"{r.status_code}:{r.text[:800]}"


def _flatten_nodes(nodes: list[dict[str, Any]]) -> list[dict[str, str]]:
    """
    Convert REST export shape into simple (title,url) pairs (top-level only).
    """
    out: list[dict[str, str]] = []
    for n in nodes or []:
        if not isinstance(n, dict):
            continue
        title = str(n.get("Title") or n.get("title") or "").strip()
        url = str(n.get("Url") or n.get("url") or "").strip()
        if title and url:
            out.append({"title": title, "url": url})
    return out


def run_import() -> dict[str, Any]:
    ctx.load_migration_target_env()
    sp_client.authenticate()

    root = ctx.migration_export_root()
    top_path = root / "navigation" / "topNavigationBar.json"
    quick_path = root / "navigation" / "quickLaunch.json"

    report: dict[str, Any] = {
        "dryRun": ctx.migration_dry_run(),
        "missingExport": [],
        "planned": {"topNavigationBar": [], "quickLaunch": []},
        "created": {"topNavigationBar": 0, "quickLaunch": 0},
        "errors": [],
        "note": "This step requires SharePoint REST write access; app-only tokens may be rejected in some tenants.",
    }

    if not top_path.is_file():
        report["missingExport"].append(str(top_path))
    if not quick_path.is_file():
        report["missingExport"].append(str(quick_path))

    if report["missingExport"]:
        import_client.write_report("import_navigation", report)
        return report

    top = import_client.read_json(top_path).get("value") or []
    quick = import_client.read_json(quick_path).get("value") or []
    report["planned"]["topNavigationBar"] = _flatten_nodes(top)
    report["planned"]["quickLaunch"] = _flatten_nodes(quick)

    if report["dryRun"]:
        import_client.write_report("import_navigation", report)
        return report

    tname = (os.getenv("TENANT_NAME") or "").strip()
    if not tname:
        report["errors"].append("TENANT_NAME missing (needed for SharePoint REST)")
        import_client.write_report("import_navigation", report)
        return report
    site_abs = sp_client.sp_site_absolute_url(tname, ctx.migration_target_site_name())

    digest = _sp_digest(site_abs)
    if not digest:
        report["errors"].append("missing_request_digest (SharePoint REST likely rejects app-only token)")
        import_client.write_report("import_navigation", report)
        return report

    for loc, key in (("TopNavigationBar", "topNavigationBar"), ("QuickLaunch", "quickLaunch")):
        for node in report["planned"][key]:
            ok, err = _post_nav_node(
                site_abs,
                location=loc,
                title=node["title"],
                url=node["url"],
                digest=digest,
            )
            if ok:
                report["created"][key] += 1
            else:
                report["errors"].append(f"{key}_create_failed:{node['title']}:{err}")

    import_client.write_report("import_navigation", report)
    return report


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    r = run_import()
    print(f"import_navigation: errors={len(r.get('errors') or [])}")


if __name__ == "__main__":
    main()

