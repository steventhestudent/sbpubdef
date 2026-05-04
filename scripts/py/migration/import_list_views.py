"""
Step 6: List views — best-effort.

Graph `POST /sites/{id}/lists/{listId}/views` is not available in all tenants.
This script records exported view definitions and emits a **manual recreation checklist**.

If your tenant supports Graph view creation, extend this script using official Graph docs.
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
    idx = import_client.read_json(import_client.lists_index_path())
    views_summary: list[dict] = []
    for entry in idx.get("lists") or []:
        rel = (entry.get("exportPath") or "").strip()
        if not rel:
            continue
        vpath = ctx.migration_export_root() / rel / "views.json"
        if not vpath.is_file():
            continue
        data = import_client.read_json(vpath)
        views = data.get("views") or []
        views_summary.append(
            {
                "list": entry.get("name"),
                "exportViewCount": len(views) if isinstance(views, list) else 0,
                "source": data.get("source"),
            }
        )
    report = {
        "perList": views_summary,
        "manualSteps": [
            "Recreate views in SharePoint list settings using exported views.json as reference.",
            "If Graph adds create-view for your workload, wire POST here behind a feature flag.",
        ],
    }
    import_client.write_report("import_list_views", report)
    import_client.write_text_report(
        "import_list_views_checklist",
        "# List views (manual)\n\nRecreate each list's views using the JSON under `lists/<...>/views.json`.\n",
    )
    return report


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    run_import()
    print("import_list_views: checklist in import_reports/")


if __name__ == "__main__":
    main()
