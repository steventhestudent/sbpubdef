"""
Target-tenant context for migration *import* scripts.

Loads `config/.env.migration.target` only (does not modify production env files).
Call `load_migration_target_env()` at the start of each import script before `authenticate()`.
"""

from __future__ import annotations

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


def migration_target_site_name() -> str:
    v = (os.getenv("MIGRATION_TARGET_SITE_NAME") or os.getenv("MIGRATION_SITE_NAME") or "").strip()
    if not v:
        raise ValueError("Set MIGRATION_TARGET_SITE_NAME in config/.env.migration.target")
    return v


def migration_dry_run() -> bool:
    return (os.getenv("MIGRATION_DRY_RUN") or "false").strip().lower() in ("1", "true", "yes", "on")
