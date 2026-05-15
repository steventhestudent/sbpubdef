"""
Target-tenant context for migration *import* scripts.

Loads `config/.env.migration.target` only (does not modify production env files).
Call `load_migration_target_env()` at the start of each import script before `authenticate()`.
"""

from __future__ import annotations

import functools
import json
import os
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[3]
TARGET_ENV_FILE = REPO_ROOT / "config" / ".env.migration.target"


def load_migration_target_env(*, strict: bool = True) -> None:
    """
    Load target migration variables. Uses override=True so this file wins over
    any variables already set in the shell from other env files.
    """
    if not TARGET_ENV_FILE.is_file():
        if strict:
            raise FileNotFoundError(
                f"Missing {TARGET_ENV_FILE}. Copy config/.env.migration.target.example to "
                "config/.env.migration.target and fill in target tenant + app credentials."
            )
        return
    load_dotenv(TARGET_ENV_FILE, override=True)


def migration_export_root() -> Path:
    """Root directory containing export bundles (lists/, list_items/, libraries/, …)."""
    raw = (
        os.getenv("MIGRATION_EXPORT_DIR") or os.getenv("MIGRATION_OUTPUT_DIR") or "scripts/py/migration/.migration_output"
    ).strip()
    p = Path(raw)
    if not p.is_absolute():
        p = REPO_ROOT / p
    return p.resolve()


def import_reports_dir() -> Path:
    d = migration_export_root() / "import_reports"
    d.mkdir(parents=True, exist_ok=True)
    return d


def reports_dir() -> Path:
    """Structured migration diagnostics under export root: schema diff, import order, failures."""
    d = migration_export_root() / "reports"
    d.mkdir(parents=True, exist_ok=True)
    return d


def state_dir() -> Path:
    """Persistent migration state under export root (e.g. source→target item id map)."""
    d = migration_export_root() / "state"
    d.mkdir(parents=True, exist_ok=True)
    return d


def migration_target_site_name() -> str:
    v = (os.getenv("MIGRATION_TARGET_SITE_NAME") or os.getenv("MIGRATION_SITE_NAME") or "").strip()
    if not v:
        raise ValueError("Set MIGRATION_TARGET_SITE_NAME in config/.env.migration.target")
    return v


def migration_dry_run() -> bool:
    return (os.getenv("MIGRATION_DRY_RUN") or "false").strip().lower() in ("1", "true", "yes", "on")


def migration_url_rewrite_enabled() -> bool:
    """Replace source site absolute URLs in field values with the target site (see field_transform)."""
    return (os.getenv("MIGRATION_REWRITE_SOURCE_SITE_URLS") or "true").strip().lower() in ("1", "true", "yes", "on")


@functools.cache
def _migration_source_site_absolute_url_cached(*, export_root: str, site_url_override: str) -> str | None:
    if site_url_override:
        return site_url_override.rstrip("/")
    p = Path(export_root) / "site" / "site.json"
    if not p.is_file():
        return None
    try:
        with open(p, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        return None
    u = (data.get("webUrl") or "").strip()
    return u.rstrip("/") or None


def migration_source_site_absolute_url() -> str | None:
    """Base URL of the exported source site (no trailing slash), or None if unknown."""
    return _migration_source_site_absolute_url_cached(
        export_root=str(migration_export_root()),
        site_url_override=(os.getenv("MIGRATION_SOURCE_SITE_URL") or "").strip(),
    )


@functools.cache
def _migration_target_site_absolute_url_cached(*, tenant: str, site_name: str) -> str:
    from migration import sp_client

    return sp_client.sp_site_absolute_url(tenant, site_name).rstrip("/")


def migration_target_site_absolute_url() -> str:
    """Base URL of the target site (no trailing slash). Uses TENANT_NAME + MIGRATION_TARGET_SITE_NAME."""
    tenant = (os.getenv("TENANT_NAME") or "").strip()
    if not tenant:
        raise ValueError("TENANT_NAME is required for migration target site URL rewrite")
    return _migration_target_site_absolute_url_cached(tenant=tenant, site_name=migration_target_site_name())


def migration_graph_all_day_eventdate_plus_one() -> bool:
    """
    When true (default), add one calendar day to ``EventDate`` on Graph create for ``fAllDayEvent`` items.

    Microsoft Graph still shifts stored ``EventDate`` back one calendar day for many tenants when
    ``fAllDayEvent`` is true; adding a day in the POST body compensates (see
    https://github.com/SharePoint/sp-dev-docs/issues/2755). Set ``MIGRATION_GRAPH_ALLDAY_EVENTDATE_PLUS_ONE=false``
    if your tenant stores the correct date without this adjustment (or dates become one day late).
    """
    return (os.getenv("MIGRATION_GRAPH_ALLDAY_EVENTDATE_PLUS_ONE") or "true").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )
