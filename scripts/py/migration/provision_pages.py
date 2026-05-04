"""
Step 10: Page shell / reconstruction **report** (best-effort).

Graph `POST /sites/{id}/pages` for modern pages is tenant-specific and not safely generalized here.
This script reads exported `pages/*.json` and writes **per-page reconstruction reports**:
expected layout sections, web part types/titles, and manual steps after SPFx package deployment.

Do **not** POST raw exported page JSON unchanged.
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


def _extract_webparts(canvas: dict | None) -> list[dict]:
    out: list[dict] = []
    if not isinstance(canvas, dict):
        return out
    for hs in canvas.get("horizontalSections") or []:
        for col in hs.get("columns") or []:
            for wp in col.get("webparts") or []:
                out.append(
                    {
                        "@odata.type": wp.get("@odata.type"),
                        "id": wp.get("id"),
                        "title": wp.get("title"),
                        "webPartType": wp.get("webPartType") or wp.get("type"),
                        "dataVersion": wp.get("dataVersion"),
                    }
                )
    return out


def run_import() -> dict:
    ctx.load_migration_target_env()
    pages_dir = ctx.migration_export_root() / "pages"
    if not pages_dir.is_dir():
        return {"error": "no pages export directory"}

    reports_dir = ctx.import_reports_dir() / "page_reconstruction"
    reports_dir.mkdir(parents=True, exist_ok=True)
    summary: list[dict] = []

    for fp in sorted(pages_dir.glob("*.json")):
        if fp.name == "index.json" or ".error" in fp.name or ".partial" in fp.name:
            continue
        try:
            page = import_client.read_json(fp)
        except Exception:
            continue
        title = page.get("title") or page.get("name") or fp.stem
        canvas = page.get("canvasLayout")
        wps = _extract_webparts(canvas)
        custom = [w for w in wps if w.get("@odata.type") and "clientSide" in str(w["@odata.type"]).lower()]
        md_lines = [
            f"# Page reconstruction: {title}",
            "",
            f"- Export file: `{fp.name}`",
            "- **Manual**: Create or match a modern page in the target Site Pages library.",
            "- Deploy the SPFx `.sppkg` to the target app catalog **before** expecting custom web parts to render.",
            "",
            "## Expected web parts (from export)",
            "",
        ]
        if not wps:
            md_lines.append("_No canvasLayout web parts in export — use `.aspx` from library export as reference._")
        else:
            for i, w in enumerate(wps, 1):
                md_lines.append(f"{i}. `{w.get('@odata.type')}` title={w.get('title')!r} id={w.get('id')}")
        if custom:
            md_lines.extend(
                [
                    "",
                    "## SPFx / custom web parts",
                    "",
                    "The following entries look client-side / custom. Re-add in the browser after solution deploy:",
                    "",
                ]
            )
            for w in custom:
                md_lines.append(f"- {w}")

        out_md = reports_dir / f"{fp.stem}.md"
        out_md.write_text("\n".join(md_lines), encoding="utf-8")
        summary.append(
            {
                "file": fp.name,
                "title": title,
                "webPartCount": len(wps),
                "customWebPartCount": len(custom),
                "report": str(out_md.relative_to(ctx.migration_export_root())),
            }
        )

    import_client.write_report("provision_pages_summary", {"pages": summary})
    return {"pageReports": len(summary)}


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    r = run_import()
    print(f"provision_pages: wrote {r.get('pageReports', 0)} reports under import_reports/page_reconstruction/")


if __name__ == "__main__":
    main()
