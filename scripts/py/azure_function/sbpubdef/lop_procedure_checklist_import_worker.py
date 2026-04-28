"""
Background worker (timer-trigger) to finish procedure checklist extraction:
- finds items where fields/json == 'PENDING'
- downloads the PDF from user_uploads drive
- runs the normal ProcedureChecklist pipeline to populate json + ProcedureSteps + images
"""

from __future__ import annotations

import json
import logging
import os
import shutil
import tempfile
from typing import Any

import azure.functions as func

from .local_upload import (
    authenticate,
    download_drive_file_bytes,
    get_drive_id,
    get_list_id,
    get_list_items,
    get_site_id,
    update_list_item,
)


def _safe_str(v: Any) -> str:
    return str(v or "").strip()


def main(timer: func.TimerRequest) -> None:
    log = logging.getLogger(__name__)
    tmp_root = ""
    try:
        hub = os.getenv("HUB_NAME") or ""
        if not hub:
            log.error("Missing HUB_NAME")
            return

        authenticate()
        site_id = get_site_id(hub)
        drive_id = get_drive_id(site_id, "user_uploads")
        if not drive_id:
            log.error("Could not resolve drive id for user_uploads")
            return

        procedures_list_title = (os.getenv("LIST_PROCEDURECHECKLIST") or "LOPProcedureChecklist").strip()
        procedures_list_id = get_list_id(site_id, procedures_list_title)
        if not procedures_list_id:
            log.error("Could not resolve LIST_PROCEDURECHECKLIST id")
            return

        # Fetch a small batch and filter in python (Graph filters on multiline can be flaky).
        rows = get_list_items(
            site_id,
            procedures_list_id,
            top=25,
            fields_select=["Filename", "Category", "DocumentURL", "json", "Title", "Purpose", "EffectiveDate"],
        )
        pending: list[dict[str, Any]] = []
        for r in rows or []:
            f = r.get("fields") or {}
            if _safe_str(f.get("json")).upper() == "PENDING":
                pending.append(r)

        if not pending:
            return

        from .lop.procedure_checklist.ProcedureChecklist import ProcedureChecklist as ProcedureChecklistModel

        tmp_root = tempfile.mkdtemp(prefix="lop_pc_worker_")
        os.makedirs(os.path.join(tmp_root, "img"), exist_ok=True)

        for r in pending:
            try:
                item_id = int(r.get("id") or 0)
                if item_id <= 0:
                    continue
                f = r.get("fields") or {}
                filename = _safe_str(f.get("Filename"))
                if not filename:
                    continue
                category = _safe_str(f.get("Category")) or "Uncategorized"
                doc_url = _safe_str(f.get("DocumentURL"))

                pdf_name = filename if filename.lower().endswith(".pdf") else f"{filename}.pdf"
                path = f"resource/LOP/ProcedureChecklist/{pdf_name}"
                pdf_bytes = download_drive_file_bytes(site_id, drive_id, path=path)
                pdf_path = os.path.join(tmp_root, pdf_name)
                with open(pdf_path, "wb") as out:
                    out.write(pdf_bytes)

                # Mark as processing to avoid re-pickup.
                update_list_item(site_id, procedures_list_id, item_id, {"json": "PROCESSING"})

                pc = ProcedureChecklistModel(
                    pdf_path,
                    category,
                    tmp_root,
                    procedure_list_item_id=item_id,
                    force_new_list_item=False,
                    skip_pdf_upload=True,
                    document_url_override=doc_url or None,
                )
                # Use parsed fields; the Start endpoint wrote Title/Purpose/EffectiveDate already.
                pc.run(field_overrides=None)

            except Exception as e:
                log.exception("Worker failed for a pending item")
                try:
                    rid = int(r.get("id") or 0)
                    if rid > 0:
                        update_list_item(site_id, procedures_list_id, rid, {"json": f"ERROR: {e}"[:250]})
                except Exception:
                    pass
                continue

    finally:
        if tmp_root:
            try:
                shutil.rmtree(tmp_root, ignore_errors=True)
            except Exception:
                pass

