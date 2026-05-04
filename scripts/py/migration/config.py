"""
Centralized paths and environment for migration exports.

Loads no secrets here — use `azure_function.sbpubdef.local_upload.authenticate()` after
`dotenv` has been applied (the local_upload module loads config/*.env on import).
"""

from __future__ import annotations

import os
from pathlib import Path

# scripts/py/migration/config.py -> repo root is parents[3]
REPO_ROOT = Path(__file__).resolve().parents[3]


def migration_output_dir() -> Path:
    """
    Root directory for all export artifacts.
    Override with env MIGRATION_OUTPUT_DIR (absolute or relative to repo root).
    """
    raw = (os.getenv("MIGRATION_OUTPUT_DIR") or "scripts/py/migration/.migration_output").strip()
    p = Path(raw)
    if not p.is_absolute():
        p = REPO_ROOT / p
    return p.resolve()


def migration_site_name() -> str:
    """
    SharePoint site path segment (the `{site-name}` in /sites/{site-name}).
    Prefer MIGRATION_SITE_NAME; fall back to HUB_NAME for compatibility with existing scripts.
    """
    name = (os.getenv("MIGRATION_SITE_NAME") or os.getenv("HUB_NAME") or "").strip()
    if not name:
        raise ValueError(
            "Set MIGRATION_SITE_NAME or HUB_NAME to the SharePoint site path name (e.g. PD-Intranet)."
        )
    return name


def list_items_page_size() -> int:
    return max(50, min(int(os.getenv("MIGRATION_LIST_ITEMS_PAGE_SIZE") or "200"), 999))


def export_doc_library_list_items() -> bool:
    """If false, skip Graph list-item export for document-library templates (files still exported via drives)."""
    v = (os.getenv("MIGRATION_EXPORT_DOC_LIB_LIST_ITEMS") or "false").strip().lower()
    return v in ("1", "true", "yes", "on")
