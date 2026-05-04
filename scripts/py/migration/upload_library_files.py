"""
Step 8–9: Upload files from `libraries/<drive>/files/` using Graph PUT content.

Skips `*.metadata.json` sidecars. Matches target drive by **name** from export manifest.

Requires write permission (e.g. Sites.ReadWrite.All) for uploads.
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


def _drive_id_by_name(site_id: str, name: str) -> str | None:
    for d in sp_client.get_site_drives(site_id):
        if d.get("name") == name:
            return d.get("id")
    return None


def run_import() -> dict:
    ctx.load_migration_target_env()
    sp_client.authenticate()
    dry = ctx.migration_dry_run()
    site_id = import_client.target_site_id()
    root = ctx.migration_export_root() / "libraries"
    manifest_path = root / "_manifest.json"
    if not manifest_path.is_file():
        raise FileNotFoundError(f"Missing {manifest_path}")

    manifest = import_client.read_json(manifest_path)
    uploaded = 0
    errors: list[dict] = []

    for d in manifest.get("drives") or []:
        dname = d.get("name")
        exp_path = d.get("exportPath")
        if not dname or not exp_path:
            continue
        drive_id = _drive_id_by_name(site_id, dname)
        if not drive_id:
            errors.append({"drive": dname, "error": "drive_not_found_on_target"})
            continue

        files_root = root / Path(exp_path).name / "files"
        if not files_root.is_dir():
            continue
        for fp in files_root.rglob("*"):
            if not fp.is_file():
                continue
            if fp.name.endswith(".metadata.json"):
                continue
            rel = fp.relative_to(files_root).as_posix()
            if dry:
                uploaded += 1
                continue
            try:
                data = fp.read_bytes()
                res = import_client.upload_drive_file_bytes(site_id, drive_id, rel, data)
                if res is None:
                    errors.append({"drive": dname, "path": rel, "error": "upload_failed"})
                else:
                    uploaded += 1
            except Exception as e:
                errors.append({"drive": dname, "path": rel, "error": str(e)[:400]})

    report = {"dryRun": dry, "uploaded": uploaded, "errorCount": len(errors), "errors": errors[:200]}
    import_client.write_report("upload_library_files", report)
    return report


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    r = run_import()
    print(f"upload_library_files: uploaded={r['uploaded']} errors={r['errorCount']} dryRun={r['dryRun']}")


if __name__ == "__main__":
    main()
