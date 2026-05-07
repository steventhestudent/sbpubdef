"""
Step 10: Targeted modern page provision + reconstruction (best-effort).

This is a constrained provisioner for small migrations (a few pages).

Reads exported `pages/*.json` and attempts to:
  - create a modern page shell in the target tenant (Site Pages library)
  - apply a safe, best-effort canvasLayout (sections/columns/web parts)
  - publish the page where supported

It always writes per-page reconstruction reports for anything that remains manual.

Do **not** POST raw exported page JSON unchanged.
"""

from __future__ import annotations

import json
import logging
import os
import sys
from pathlib import Path
from typing import Any

_SP = Path(__file__).resolve().parents[1]
if str(_SP) not in sys.path:
    sys.path.insert(0, str(_SP))

from migration import import_client
from migration import import_context as ctx
from migration import sp_client

logger = logging.getLogger(__name__)

_SITEPAGES_INTERNAL_NAME = "SitePages"


def _spfx_deployed() -> bool:
    """
    Custom SPFx web parts are safest to add only after the solution is deployed.
    Operator sets MIGRATION_SPFX_DEPLOYED=true once `.sppkg` is deployed to the target tenant.
    """
    return (os.getenv("MIGRATION_SPFX_DEPLOYED") or "").strip().lower() in ("1", "true", "yes", "on")


def _safe_page_name(name: str) -> str:
    n = (name or "").strip()
    if not n:
        return ""
    if not n.lower().endswith(".aspx"):
        n = f"{n}.aspx"
    return n


def _is_custom_webpart(wp: dict[str, Any]) -> bool:
    od = str(wp.get("@odata.type") or "").lower()
    if "clientside" in od:
        return True
    data = wp.get("data") or {}
    if isinstance(data, dict):
        props = data.get("properties") or {}
        if isinstance(props, dict) and props.get("clientSideComponentId"):
            return True
    return False


def _sanitize_webpart_for_graph(
    wp: dict[str, Any],
    *,
    allow_custom: bool,
) -> tuple[dict[str, Any] | None, str | None]:
    """
    Return (sanitized_webpart, skip_reason). Never returns raw export dict.
    """
    if not isinstance(wp, dict):
        return None, "invalid_webpart_shape"
    if _is_custom_webpart(wp) and not allow_custom:
        return None, "custom_webpart_requires_spfx_deploy"

    out: dict[str, Any] = {}
    for k in ("@odata.type", "id", "title", "webPartType", "dataVersion"):
        if wp.get(k) is not None:
            out[k] = wp.get(k)

    # Some exports use `type` instead of webPartType.
    if not out.get("webPartType") and wp.get("type") is not None:
        out["webPartType"] = wp.get("type")

    data = wp.get("data")
    if isinstance(data, dict):
        d2: dict[str, Any] = {}
        for k in ("title", "description", "properties", "serverProcessedContent"):
            if data.get(k) is not None:
                d2[k] = data.get(k)
        if d2:
            out["data"] = d2

    if not out.get("@odata.type"):
        return None, "missing_odata_type"
    if not out.get("webPartType"):
        return None, "missing_webPartType"
    return out, None


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


def _build_canvaslayout_payload(
    canvas: dict[str, Any] | None,
    *,
    allow_custom: bool,
) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    if not isinstance(canvas, dict):
        return None, [{"status": "skipped", "reason": "missing_canvasLayout"}]
    results: list[dict[str, Any]] = []
    hs_out: list[dict[str, Any]] = []

    for hs in canvas.get("horizontalSections") or []:
        if not isinstance(hs, dict):
            continue
        hs2: dict[str, Any] = {}
        for k in ("id", "layout", "emphasis"):
            if hs.get(k) is not None:
                hs2[k] = hs.get(k)

        cols_out: list[dict[str, Any]] = []
        for col in hs.get("columns") or []:
            if not isinstance(col, dict):
                continue
            c2: dict[str, Any] = {}
            for k in ("id", "width"):
                if col.get(k) is not None:
                    c2[k] = col.get(k)

            wps_out: list[dict[str, Any]] = []
            for wp in col.get("webparts") or []:
                swp, reason = _sanitize_webpart_for_graph(wp, allow_custom=allow_custom)
                if swp is None:
                    results.append(
                        {
                            "status": "skipped",
                            "reason": reason,
                            "sectionId": hs.get("id"),
                            "columnId": col.get("id"),
                            "webPartTitle": (wp or {}).get("title") if isinstance(wp, dict) else None,
                            "webPartType": (wp or {}).get("webPartType") if isinstance(wp, dict) else None,
                            "properties": ((wp or {}).get("data") or {}).get("properties")
                            if isinstance(wp, dict)
                            else None,
                        }
                    )
                    continue
                wps_out.append(swp)
                results.append(
                    {
                        "status": "planned",
                        "sectionId": hs.get("id"),
                        "columnId": col.get("id"),
                        "webPartTitle": swp.get("title"),
                        "webPartType": swp.get("webPartType"),
                    }
                )

            if wps_out:
                c2["webparts"] = wps_out
            cols_out.append(c2)

        if cols_out:
            hs2["columns"] = cols_out
        if hs2:
            hs_out.append(hs2)

    if not hs_out:
        return None, results + [{"status": "skipped", "reason": "no_sections_in_export"}]
    return {"horizontalSections": hs_out}, results


def _graph_create_site_page(site_id: str, name: str, title: str) -> tuple[dict[str, Any] | None, str | None]:
    url = f"{sp_client.GRAPH_BETA}/sites/{site_id}/pages"
    body = {
        "@odata.type": "microsoft.graph.sitePage",
        "name": name,
        "title": title,
        "pageLayout": "article",
    }
    r = sp_client.graph_post(url, json_body=body)
    if r.status_code < 300:
        return r.json(), None
    return None, r.text[:1200]


def _graph_patch_page(site_id: str, page_id: str, payload: dict[str, Any]) -> tuple[bool, str | None]:
    url = f"{sp_client.GRAPH_BETA}/sites/{site_id}/pages/{page_id}"
    r = sp_client.graph_patch(url, json_body=payload)
    if r.status_code < 300:
        return True, None
    return False, r.text[:1200]


def _graph_publish_page(site_id: str, page_id: str) -> tuple[bool, str | None]:
    url = f"{sp_client.GRAPH_BETA}/sites/{site_id}/pages/{page_id}/publish"
    r = sp_client.graph_post(url, json_body={})
    if r.status_code < 300:
        return True, None
    return False, r.text[:1200]

def run_import() -> dict:
    ctx.load_migration_target_env()
    sp_client.authenticate()
    site_id = import_client.target_site_id()
    pages_dir = ctx.migration_export_root() / "pages"
    if not pages_dir.is_dir():
        return {"error": "no pages export directory"}

    reports_dir = ctx.import_reports_dir() / "page_reconstruction"
    reports_dir.mkdir(parents=True, exist_ok=True)
    summary: list[dict[str, Any]] = []
    allow_custom = _spfx_deployed()
    dry = ctx.migration_dry_run()

    for fp in sorted(pages_dir.glob("*.json")):
        if fp.name == "index.json" or ".error" in fp.name or ".partial" in fp.name:
            continue
        try:
            page = import_client.read_json(fp)
        except Exception:
            continue
        title = str(page.get("title") or page.get("name") or fp.stem)
        name = _safe_page_name(str(page.get("name") or fp.stem))
        canvas = page.get("canvasLayout") if isinstance(page.get("canvasLayout"), dict) else None
        wps = _extract_webparts(canvas)
        custom = [w for w in wps if w.get("@odata.type") and "clientSide" in str(w["@odata.type"]).lower()]
        source_url = str(page.get("webUrl") or "")

        created = False
        patched_layout = False
        published = False
        target_url = ""
        errors: list[str] = []

        created_page: dict[str, Any] | None = None
        if not name:
            errors.append("missing_page_name")
        else:
            if dry:
                created = True
                target_url = ""
                created_page = {"id": "dry-run", "name": name, "title": title}
            else:
                created_page, create_err = _graph_create_site_page(site_id, name, title)
                if created_page:
                    created = True
                    target_url = str(created_page.get("webUrl") or "")
                else:
                    errors.append(f"create_failed: {create_err}")

        canvas_payload, wp_results = _build_canvaslayout_payload(canvas, allow_custom=allow_custom)
        if created_page and canvas_payload:
            if dry:
                patched_layout = True
            else:
                ok, perr = _graph_patch_page(site_id, str(created_page.get("id") or ""), {"canvasLayout": canvas_payload})
                patched_layout = ok
                if not ok and perr:
                    errors.append(f"layout_patch_failed: {perr}")

        if created_page:
            if dry:
                published = True
            else:
                ok, perr = _graph_publish_page(site_id, str(created_page.get("id") or ""))
                published = ok
                if not ok and perr:
                    errors.append(f"publish_failed: {perr}")

        md_lines = [
            f"# Page reconstruction: {title}",
            "",
            f"- Export file: `{fp.name}`",
            f"- Source page URL: `{source_url}`" if source_url else "- Source page URL: (unknown)",
            f"- Target page URL: `{target_url}`" if target_url else "- Target page URL: (not created)",
            f"- **Created page shell**: {created}",
            f"- **Applied canvasLayout**: {patched_layout}",
            f"- **Published**: {published}",
            f"- **SPFx deployed**: {allow_custom}",
            f"- **Dry run**: {dry}",
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
                    "The following entries look client-side / custom. If skipped, deploy the solution then re-add manually:",
                    "",
                ]
            )
            for w in custom:
                md_lines.append(f"- {w}")

        if wp_results:
            md_lines.extend(["", "## Web part placement results", ""])
            for r in wp_results:
                md_lines.append(f"- {r}")

        if errors:
            md_lines.extend(["", "## Errors", ""])
            for e in errors:
                md_lines.append(f"- {e}")

        md_lines.extend(
            [
                "",
                "## Manual steps (if needed)",
                "",
                "- Ensure the SPFx `.sppkg` is deployed to the target tenant **before** expecting custom web parts to work.",
                "- If the page was not created automatically, create it in **Site Pages** with the same name/title.",
                "- For skipped web parts, use the placement results above (sectionId/columnId) to place them.",
                "",
            ]
        )

        out_md = reports_dir / f"{fp.stem}.md"
        out_md.write_text("\n".join(md_lines), encoding="utf-8")
        summary.append(
            {
                "file": fp.name,
                "title": title,
                "name": name,
                "sourceUrl": source_url,
                "targetUrl": target_url,
                "created": created,
                "layoutPatched": patched_layout,
                "published": published,
                "webPartCount": len(wps),
                "customWebPartCount": len(custom),
                "spfxDeployed": allow_custom,
                "dryRun": dry,
                "errors": errors[:50],
                "report": str(out_md.relative_to(ctx.migration_export_root())),
            }
        )

    import_client.write_report("provision_pages_summary", {"pages": summary})
    import_client.write_migration_reports_json(
        "page_import_summary",
        {
            "targetSite": ctx.migration_target_site_name(),
            "spfxDeployed": allow_custom,
            "dryRun": dry,
            "pages": summary,
            "counts": {
                "total": len(summary),
                "created": sum(1 for p in summary if p.get("created")),
                "published": sum(1 for p in summary if p.get("published")),
                "withErrors": sum(1 for p in summary if p.get("errors")),
            },
        },
    )
    return {"pageReports": len(summary)}


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    r = run_import()
    print(f"provision_pages: wrote {r.get('pageReports', 0)} reports under import_reports/page_reconstruction/")


if __name__ == "__main__":
    main()
