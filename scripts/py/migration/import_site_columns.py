"""
Step 3 (partial): Site columns (field definitions at site scope).

Graph site column creation is limited and error-prone across column types.
This script lists exported column-like artifacts and emits a manual checklist.

Prefer creating columns at **list** scope via `import_list_columns.py` after lists exist,
or use PnP / SharePoint UI for complex field types.
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

logger = logging.getLogger(__name__)


def run_import() -> dict:
    ctx.load_migration_target_env()
    manual = [
        "Site-scoped columns: use SharePoint settings UI or PnP where Graph coverage is incomplete.",
        "Target schema assumption: key lists use canonical internal names (e.g. Assignments.Status).",
    ]
    report = {"manualSteps": manual, "automatedCreates": 0}
    import_client.write_report("import_site_columns", report)
    import_client.write_text_report("import_site_columns_checklist", "# Site columns\n\n" + "\n".join(f"- {m}" for m in manual))
    return report


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    run_import()
    print("import_site_columns: checklist written to import_reports/")


if __name__ == "__main__":
    main()
