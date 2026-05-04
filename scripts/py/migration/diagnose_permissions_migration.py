"""
Permissions diagnostics: export gaps + manual verification checklist.

Does not change the target tenant. Reads `permissions/` from the export bundle if present.
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

_SP = Path(__file__).resolve().parents[1]
if str(_SP) not in sys.path:
    sys.path.insert(0, str(_SP))

from migration import import_client
from migration import import_context as ctx

logger = logging.getLogger(__name__)


def run_import() -> dict:
    ctx.load_migration_target_env(strict=False)
    root = ctx.migration_export_root()
    perm_dir = root / "permissions"
    notes_path = perm_dir / "notes.json"
    checklist = [
        "## SharePoint permissions — manual verification",
        "",
        "- [ ] Site owners / members groups match intended access model.",
        "- [ ] Unique permissions on lists or libraries (export may not have captured item-level ACLs).",
        "- [ ] Entra ID group–based access: recreate groups or map to new tenant groups.",
        "- [ ] Sharing links / guest access: review separately in SharePoint admin.",
        "- [ ] App-only REST 401 during export: re-check critical libraries with a user account.",
        "",
    ]
    if notes_path.is_file():
        notes = import_client.read_json(notes_path)
        checklist.append("### Export notes.json summary")
        checklist.append("```json")
        checklist.append(json.dumps(notes, indent=2)[:4000])
        checklist.append("```")
    else:
        checklist.append("_No permissions/notes.json in export — run export_permissions.py on source._")

    import_client.write_text_report("diagnose_permissions_checklist", "\n".join(checklist))
    import_client.write_report(
        "diagnose_permissions_migration",
        {"exportPermissionsDirExists": perm_dir.is_dir(), "checklist": "import_reports/diagnose_permissions_checklist.md"},
    )
    return {"ok": True}


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    run_import()
    print("diagnose_permissions_migration: wrote import_reports/diagnose_permissions_checklist.md")


if __name__ == "__main__":
    main()
