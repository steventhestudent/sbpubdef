"""
Run migration import / provision steps in the documented order.

Loads **only** `config/.env.migration.target` (via each step) — keep production `config/.env.dev` unchanged.

Usage (repo root):

  PYTHONPATH=scripts/py python3 scripts/py/migration/run_full_import.py
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

_SP = Path(__file__).resolve().parents[1]
if str(_SP) not in sys.path:
    sys.path.insert(0, str(_SP))

from migration import apply_page_webparts
from migration import diagnose_permissions_migration
from migration import import_content_types
from migration import import_libraries
from migration import import_list_columns
from migration import import_list_items
from migration import import_list_views
from migration import import_lists
from migration import import_site_columns
from migration import provision_pages
from migration import provision_site
from migration import upload_library_files
from migration import validate_import

logger = logging.getLogger(__name__)

def _error_count(result: object) -> int:
    """
    Best-effort extraction of "how many errors happened" from step reports.
    Import steps return heterogeneous dict shapes; this keeps the wrapper honest.
    """
    if not isinstance(result, dict):
        return 0
    if isinstance(result.get("errorCount"), int):
        return int(result["errorCount"])
    # Some steps use "errors" as an int, others as a list.
    errs = result.get("errors")
    if isinstance(errs, int):
        return int(errs)
    if isinstance(errs, list):
        return len(errs)
    # Common alternative keys
    for k in ("errorSamples", "failed", "failures"):
        v = result.get(k)
        if isinstance(v, list):
            return len(v)
    return 0


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    errors: list[tuple[str, str]] = []

    steps: list[tuple[str, object]] = [
        ("provision_site (connectivity + site exists)", provision_site.run_import),
        ("import_content_types (inventory)", import_content_types.run_import),
        ("import_site_columns (checklist)", import_site_columns.run_import),
        ("import_lists", import_lists.run_import),
        ("import_list_columns", import_list_columns.run_import),
        ("import_list_views (checklist)", import_list_views.run_import),
        ("import_list_items", import_list_items.run_import),
        ("import_libraries (drive name check)", import_libraries.run_import),
        ("upload_library_files", upload_library_files.run_import),
        ("__manual__ SPFx package", None),
        ("provision_pages (reports)", provision_pages.run_import),
        ("apply_page_webparts (remediation)", apply_page_webparts.run_import),
        ("validate_import", validate_import.run_import),
        ("diagnose_permissions_migration", diagnose_permissions_migration.run_import),
    ]

    for name, fn in steps:
        print(f"\n=== {name} ===")
        if fn is None:
            print(
                "MANUAL STEP: Upload and deploy the SPFx `.sppkg` to the **target** tenant app catalog "
                "(`pnpm run make` then SharePoint admin). Custom web parts will not resolve until this is done."
            )
            continue
        try:
            result = fn()
            nerr = _error_count(result)
            if nerr:
                errors.append((name, f"step_reported_errors={nerr}"))
        except Exception as e:
            err = f"{type(e).__name__}: {e}"
            print(f"ERROR: {err}")
            errors.append((name, err))

    if errors:
        print("\nCompleted with errors:")
        for n, e in errors:
            print(f"  - {n}: {e}")
        sys.exit(1)
    print("\nrun_full_import: finished.")
    sys.exit(0)


if __name__ == "__main__":
    main()
