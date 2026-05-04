"""
Step 11: Web part remediation checklist (runs **after** SPFx deploy).

Graph PATCH of `canvasLayout` is fragile and not automated by default.
This script aggregates web parts from exported pages and writes:

- `import_reports/apply_page_webparts_remediation.json`
- `import_reports/apply_page_webparts_remediation.md`

Use these as a QA checklist: compare expected web parts vs what you see in the browser after rebuild.
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


def _walk_webparts(canvas: dict | None) -> list[dict]:
    found: list[dict] = []
    if not isinstance(canvas, dict):
        return found
    for hs in canvas.get("horizontalSections") or []:
        for col in hs.get("columns") or []:
            for wp in col.get("webparts") or []:
                found.append(
                    {
                        "pageContext": "canvasLayout",
                        "webPart": wp,
                    }
                )
    return found


def run_import() -> dict:
    ctx.load_migration_target_env()
    pages_dir = ctx.migration_export_root() / "pages"
    all_wp: list[dict] = []
    if pages_dir.is_dir():
        for fp in sorted(pages_dir.glob("*.json")):
            if fp.name == "index.json" or ".error" in fp.name:
                continue
            try:
                page = import_client.read_json(fp)
            except Exception:
                continue
            title = page.get("title") or fp.stem
            for entry in _walk_webparts(page.get("canvasLayout")):
                all_wp.append({"pageTitle": title, "exportFile": fp.name, **entry})

    md = [
        "# Web part remediation (manual)",
        "",
        "1. Deploy SPFx package to target tenant app catalog.",
        "2. Recreate or fix-up each modern page shell.",
        "3. For each row below, add/configure the web part in SharePoint and match **title** / **type**.",
        "",
        f"Total web part instances found in export: **{len(all_wp)}**",
        "",
    ]
    for i, row in enumerate(all_wp[:500], 1):
        wp = row.get("webPart") or {}
        md.append(
            f"{i}. **{row.get('pageTitle')}** — `{wp.get('@odata.type')}` title={wp.get('title')!r}"
        )

    import_client.write_report("apply_page_webparts_remediation", {"webparts": all_wp})
    import_client.write_text_report("apply_page_webparts_remediation", "\n".join(md))
    return {"webPartInstances": len(all_wp)}


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    r = run_import()
    print(f"apply_page_webparts: instances={r['webPartInstances']} (see import_reports/)")


if __name__ == "__main__":
    main()
