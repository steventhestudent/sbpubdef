"""
Step 3 (partial): Site content types via Graph.

Full fidelity recreation of inherited / hub content types is not safely automated here.
This script inventories the export and emits a manual checklist + optional dry-run log.

For many tenants, content types are recreated by hub association or manual admin work.
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
    root = ctx.migration_export_root()
    ct_path = root / "content_types" / "site_content_types.json"
    if not ct_path.is_file():
        report = {"error": f"Missing export file {ct_path}", "manualSteps": []}
        import_client.write_report("import_content_types", report)
        return report
    data = import_client.read_json(ct_path)
    types = data.get("value") or data.get("types") or []
    manual = [
        "Review exported site_content_types.json and hub content type publishing on the target tenant.",
        "Create or map content types in SharePoint admin / Content type gallery as needed.",
        "Do not POST inherited types blindly — IDs and parent chains differ per tenant.",
    ]
    report = {
        "exportedTypeCount": len(types) if isinstance(types, list) else 0,
        "automatedCreates": 0,
        "manualSteps": manual,
        "note": "Automated Graph POST of arbitrary site content types is intentionally out of scope for safety.",
    }
    import_client.write_report("import_content_types", report)
    import_client.write_text_report(
        "import_content_types_checklist",
        "# Content types — manual rebuild\n\n" + "\n".join(f"- {m}" for m in manual),
    )
    return report


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    run_import()
    print("import_content_types: see import_reports/import_content_types*.json|md")


if __name__ == "__main__":
    main()
