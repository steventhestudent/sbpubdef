"""
Run all migration export steps in order.

Order:
  1. Site metadata
  2. Content types (site)
  3. Lists (columns, views)
  4. List items (JSONL)
  5. Document libraries (files + metadata)
  6. Modern pages (Graph beta)
  7. Permissions (Graph + SharePoint REST)

Environment variables are loaded from repo `config/` via `azure_function.sbpubdef.local_upload`
(the same pattern as other scripts under `scripts/py`).

Usage (from repository root):

  PYTHONPATH=scripts/py python3 scripts/py/migration/run_full_export.py

Or from `scripts/py`:

  PYTHONPATH=. python3 migration/run_full_export.py
"""

from __future__ import annotations

import logging
import sys
from collections.abc import Callable
from pathlib import Path

_SP_PY = Path(__file__).resolve().parents[1]
if str(_SP_PY) not in sys.path:
    sys.path.insert(0, str(_SP_PY))

from migration import export_content_types
from migration import export_libraries
from migration import export_list_items
from migration import export_lists
from migration import export_pages
from migration import export_permissions
from migration import export_site
from migration.config import migration_output_dir


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    out = migration_output_dir()
    print(f"Migration output directory: {out}")

    steps: list[tuple[str, Callable[..., object]]] = [
        ("export_site", export_site.run_export),
        ("export_content_types", export_content_types.run_export),
        ("export_lists", export_lists.run_export),
        ("export_list_items", export_list_items.run_export),
        ("export_libraries", export_libraries.run_export),
        ("export_pages", export_pages.run_export),
        ("export_permissions", export_permissions.run_export),
    ]

    errors: list[tuple[str, str]] = []
    for name, fn in steps:
        print(f"\n=== {name} ===")
        try:
            fn()
        except Exception as e:
            err = f"{type(e).__name__}: {e}"
            print(f"ERROR: {err}")
            errors.append((name, err))

    if errors:
        print("\nCompleted with errors:")
        for n, e in errors:
            print(f"  - {n}: {e}")
        sys.exit(1)
    print("\nrun_full_export: all steps finished.")
    sys.exit(0)


if __name__ == "__main__":
    main()
