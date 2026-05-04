"""
Step 8 (partial): Compare exported library manifest with target site drives.

Ensures document libraries from export exist as drives on the target (by drive `name`).
Does not upload binaries — use `upload_library_files.py`.
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
    site_id = import_client.target_site_id()
    man_path = ctx.migration_export_root() / "libraries" / "_manifest.json"
    if not man_path.is_file():
        report = {"error": f"Missing {man_path}", "missingDrives": []}
        import_client.write_report("import_libraries", report)
        return report

    manifest = import_client.read_json(man_path)
    expected = [d.get("name") for d in manifest.get("drives") or [] if d.get("name")]
    drives = sp_client.get_site_drives(site_id)
    have = {d.get("name") for d in drives}
    missing = [n for n in expected if n and n not in have]
    report = {
        "expectedDriveNames": expected,
        "presentDriveNames": sorted(have),
        "missingOnTarget": missing,
        "manualIfMissing": (
            "Create missing document libraries in SharePoint (same display names as source), "
            "or run import_lists for documentLibrary templates first, then re-run this check."
        ),
    }
    import_client.write_report("import_libraries", report)
    return report


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    r = run_import()
    print(f"import_libraries: missingOnTarget={r.get('missingOnTarget')}")


if __name__ == "__main__":
    main()
