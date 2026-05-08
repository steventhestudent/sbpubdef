"""
Step 10: Targeted modern page provision + reconstruction (best-effort).

This is a constrained provisioner for small migrations (a few pages).

Reads exported `pages/*.json` and attempts to:
  - create a modern page shell in the target tenant (Site Pages library)
  - PATCH ``canvasLayout`` from the export (best-effort; applied **before** publish while still draft)
  - publish via typed ``.../microsoft.graph.sitePage/publish``

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


def _skip_canvas_patch() -> bool:
    return (os.getenv("MIGRATION_SKIP_CANVAS_PATCH") or "").strip().lower() in ("1", "true", "yes", "on")


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


def _is_pd_announcement_page(page: dict[str, Any]) -> bool:
    """
    Heuristic: PD Announcements are modern News pages with a custom content type.
    These often include a Banner web part payload that Graph rejects on PATCH.
    """
    ct = page.get("contentType") or {}
    ct_name = str(ct.get("name") or "").strip().lower()
    promo = str(page.get("promotionKind") or "").strip().lower()
    return ct_name in ("pd announcement", "pdannouncement") or promo == "newspost"


def _first_export_text_html(page: dict[str, Any]) -> str:
    canvas = page.get("canvasLayout")
    if not isinstance(canvas, dict):
        return ""
    for hs in canvas.get("horizontalSections") or []:
        if not isinstance(hs, dict):
            continue
        for col in hs.get("columns") or []:
            if not isinstance(col, dict):
                continue
            for wp in col.get("webparts") or []:
                if not isinstance(wp, dict):
                    continue
                od = str(wp.get("@odata.type") or "").lower()
                if "textwebpart" in od:
                    ih = wp.get("innerHtml")
                    if isinstance(ih, str) and ih.strip():
                        return ih.strip()
    return ""


def _announcement_html(page: dict[str, Any]) -> str:
    """
    Minimal content for PD Announcement pages:
    - Prefer exported text web part innerHtml
    - Fallback to exported `description`
    - Optionally include a single thumbnail image (best-effort) if it looks like a real image URL
    """
    html = _first_export_text_html(page)
    if not html:
        desc = str(page.get("description") or "").strip()
        if desc:
            html = f"<p>{desc}</p>"
    thumb = str(page.get("thumbnailWebUrl") or "").strip()
    if thumb and "odm_spdefaultbanner" not in thumb and "sitepagethumbnail.png" not in thumb:
        # Keep it simple: image above text.
        img = f'<p><img src="{thumb}" alt="" /></p>'
        html = img + (html or "")
    return html


def _sanitize_webpart_for_graph(
    wp: dict[str, Any],
    *,
    allow_custom: bool,
    strip_instance_id: bool = False,
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

    # Target pages need new instance IDs; exporting source GUIDs breaks placement.
    if strip_instance_id:
        out.pop("id", None)

    # Some exports use `type` instead of webPartType.
    if not out.get("webPartType") and wp.get("type") is not None:
        out["webPartType"] = wp.get("type")

    data = wp.get("data")
    if isinstance(data, dict):
        d2: dict[str, Any] = {}
        for k in ("title", "description", "properties", "serverProcessedContent", "innerHtml", "dataVersion"):
            if data.get(k) is not None:
                d2[k] = data.get(k)
        # Graph rejects some standard webpart properties on PATCH (tenant-dependent).
        props = d2.get("properties")
        if isinstance(props, dict):
            props.pop("customContentDropSupport", None)
        if d2:
            out["data"] = d2

    if not out.get("@odata.type"):
        return None, "missing_odata_type"
    od_l = str(out.get("@odata.type") or "").lower()
    # Text / RTE web parts are valid without webPartType GUID.
    if "textwebpart" not in od_l and not out.get("webPartType"):
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
                swp, reason = _sanitize_webpart_for_graph(
                    wp, allow_custom=allow_custom, strip_instance_id=True
                )
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


def _build_announcement_canvaslayout(page: dict[str, Any]) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    """
    PD Announcement/news posts: use a minimal, resilient canvas with a single text web part.
    Avoids banner standard web part payloads that Graph may reject.
    """
    html = _announcement_html(page)
    if not html:
        return None, [{"status": "skipped", "reason": "no_description_or_textwebpart_in_export"}]
    canvas = {
        "horizontalSections": [
            {
                "id": "1",
                "layout": "oneColumn",
                "emphasis": "none",
                "columns": [
                    {
                        "id": "1",
                        "width": 12,
                        "webparts": [
                            {
                                "@odata.type": "#microsoft.graph.textWebPart",
                                "innerHtml": html,
                            }
                        ],
                    }
                ],
            }
        ]
    }
    return canvas, [{"status": "planned", "reason": "announcement_minimal_canvas"}]


def _graph_create_site_page(site_id: str, name: str, title: str) -> tuple[dict[str, Any] | None, str | None]:
    url = f"{sp_client.GRAPH_V1}/sites/{site_id}/pages"
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


def _graph_patch_page_canvas(site_id: str, page_id: str, canvas_layout: dict[str, Any]) -> tuple[bool, str, str]:
    """
    PATCH `canvasLayout` on a draft page. Tries generic page URL then typed sitePage URL.

    Returns (ok, endpoint_used_or_reason, error_body_snippet).
    """
    body = {"canvasLayout": canvas_layout}
    urls = [
        ("PATCH " + f"{sp_client.GRAPH_V1}/sites/{site_id}/pages/{page_id}", f"{sp_client.GRAPH_V1}/sites/{site_id}/pages/{page_id}"),
        (
            "PATCH "
            + f"{sp_client.GRAPH_V1}/sites/{site_id}/pages/{page_id}/microsoft.graph.sitePage",
            f"{sp_client.GRAPH_V1}/sites/{site_id}/pages/{page_id}/microsoft.graph.sitePage",
        ),
    ]
    last_err = ""
    for label, url in urls:
        r = sp_client.graph_patch(url, json_body=body)
        if r.status_code < 300:
            return True, label, ""
        last_err = r.text[:1200]
    return False, urls[-1][0], last_err


def _graph_publish_page(site_id: str, page_id: str) -> tuple[bool, str | None]:
    # Use typed endpoint (Graph v1) to avoid /publish segment errors.
    url = f"{sp_client.GRAPH_V1}/sites/{site_id}/pages/{page_id}/microsoft.graph.sitePage/publish"
    r = sp_client.graph_post(url, json_body={})
    if r.status_code < 300:
        return True, None
    return False, r.text[:1200]


def _create_failed_name_conflict(create_err: str | None) -> bool:
    if not create_err:
        return False
    compact = create_err.replace(" ", "").lower()
    return "namealreadyexists" in compact or '"code":"namealreadyexists"' in compact


def _find_existing_page_by_name(site_id: str, file_name: str) -> dict[str, Any] | None:
    """Resolve `Assignments.aspx`-style file name to a Graph page object (target id + webUrl)."""
    want = (file_name or "").strip().lower()
    if not want:
        return None
    url = f"{sp_client.GRAPH_V1}/sites/{site_id}/pages"
    try:
        for p in sp_client.graph_get_all(url, params={"$top": "999"}):
            if str(p.get("name") or "").strip().lower() == want:
                return p
    except Exception as e:
        logger.warning("list pages for resolve failed: %s", e)
    return None

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
        layout_patched = False
        layout_patch_endpoint = ""
        published = False
        target_url = ""
        errors: list[str] = []
        publish_endpoint_used = ""
        publishing_state_before: Any = None
        publishing_state_after: Any = None

        reused_existing = False
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
                    publishing_state_before = created_page.get("publishingState")
                elif _create_failed_name_conflict(create_err):
                    # Pages from a previous run already exist: PATCH canvas onto them instead of failing.
                    existing = _find_existing_page_by_name(site_id, name)
                    if existing:
                        created_page = existing
                        reused_existing = True
                        target_url = str(existing.get("webUrl") or "")
                        publishing_state_before = existing.get("publishingState")
                        logger.info(
                            "Reusing existing page %s (id=%s) for canvas patch — create returned nameAlreadyExists",
                            name,
                            existing.get("id"),
                        )
                    else:
                        errors.append(f"create_failed: {create_err}")
                        errors.append(
                            "nameAlreadyExists_but_existing_page_not_found_in_GET /sites/.../pages — check list or permissions"
                        )
                else:
                    errors.append(f"create_failed: {create_err}")

        if _is_pd_announcement_page(page):
            canvas_payload, wp_results = _build_announcement_canvaslayout(page)
        else:
            canvas_payload, wp_results = _build_canvaslayout_payload(canvas, allow_custom=allow_custom)

        # Apply canvas on a **draft** page before publish (Graph requires full canvasLayout replace).
        if (
            created_page
            and canvas_payload
            and not _skip_canvas_patch()
            and str(created_page.get("id") or "") not in ("", "dry-run")
        ):
            if dry:
                layout_patched = True
                layout_patch_endpoint = "(dry-run)"
            else:
                ok_patch, endpoint_used, patch_err = _graph_patch_page_canvas(
                    site_id, str(created_page.get("id")), canvas_payload
                )
                layout_patched = ok_patch
                layout_patch_endpoint = endpoint_used
                if not ok_patch and patch_err:
                    errors.append(f"layout_patch_failed: {patch_err}")
                elif ok_patch:
                    logger.info("Canvas layout patched for page %s (%s)", name, endpoint_used)

        if created_page:
            if dry:
                published = True
            else:
                publish_endpoint_used = "POST /sites/{siteId}/pages/{pageId}/microsoft.graph.sitePage/publish"
                ok, perr = _graph_publish_page(site_id, str(created_page.get("id") or ""))
                published = ok
                if not ok and perr:
                    errors.append(f"publish_failed: {perr}")
                else:
                    # Re-fetch after publish to get publishingState/webUrl.
                    pid = str(created_page.get("id") or "")
                    if pid:
                        r2 = sp_client.graph_request("GET", f"{sp_client.GRAPH_V1}/sites/{site_id}/pages/{pid}")
                        if r2.status_code < 300:
                            after = r2.json()
                            publishing_state_after = after.get("publishingState")
                            if after.get("webUrl"):
                                target_url = str(after.get("webUrl"))

        md_lines = [
            f"# Page reconstruction: {title}",
            "",
            f"- Export file: `{fp.name}`",
            f"- Source page URL: `{source_url}`" if source_url else "- Source page URL: (unknown)",
            f"- Target page URL: `{target_url}`" if target_url else "- Target page URL: (not created)",
            f"- **Reused existing page** (name conflict): {reused_existing}",
            f"- **Created new page shell**: {created}",
            f"- **Canvas layout PATCH applied**: {layout_patched}",
            f"- Canvas PATCH endpoint: `{layout_patch_endpoint}`" if layout_patch_endpoint else "- Canvas PATCH: (skipped or none)",
            f"- **Published**: {published}",
            f"- **SPFx deployed**: {allow_custom}",
            f"- **Dry run**: {dry}",
            f"- Publish endpoint: `{publish_endpoint_used}`" if publish_endpoint_used else "- Publish endpoint: (not attempted)",
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
                "targetPageId": str(created_page.get("id") or "") if isinstance(created_page, dict) else "",
                "reusedExisting": reused_existing,
                "created": created,
                "layoutPatched": layout_patched,
                "layoutPatchEndpoint": layout_patch_endpoint,
                "published": published,
                "publishEndpoint": publish_endpoint_used,
                "publishingStateBefore": publishing_state_before,
                "publishingStateAfter": publishing_state_after,
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
                "layoutPatched": sum(1 for p in summary if p.get("layoutPatched")),
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
