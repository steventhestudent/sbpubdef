"""
Ingest a procedure-checklist PDF: upload to SharePoint drive, extract steps like LOP_process_pdfs,
and upsert LOPProcedureChecklist + ProcedureSteps.

POST JSON (Authorization: Bearer from SPFx AadHttpClient):
  mode: "create" | "reimport"
  pdfBase64: base64-encoded PDF bytes
  filename: original file name (e.g. "MySOP.pdf")
  category?: string (create: defaults to Uncategorized; reimport: defaults from existing list item)
  procedureId?: number (required for reimport — updates that list item in place)
  title?, purpose?, effectiveDate?: optional overrides after PDF parse (non-empty strings only)
"""

from __future__ import annotations

import base64
import json
import logging
import os
import shutil
import tempfile
from typing import Any

import azure.functions as func

from .entra_jwt import caller_email_from_claims, decode_and_validate_access_token
from .local_upload import authenticate, get_list_id, get_list_item, get_site_id


def _json(body: dict[str, Any], *, status: int = 200) -> func.HttpResponse:
    return func.HttpResponse(json.dumps(body), status_code=status, mimetype="application/json")


def _as_title(pc: Any) -> str:
    t = getattr(pc, "title", "") or ""
    if isinstance(t, list) and t:
        return str(t[0] or "").strip()
    return str(t or "").strip()


def main(req: func.HttpRequest) -> func.HttpResponse:
    log = logging.getLogger(__name__)
    tmp_root = ""
    try:
        auth = req.headers.get("Authorization") or ""
        if not auth.lower().startswith("bearer "):
            return _json({"error": "Missing Authorization: Bearer token"}, status=401)
        token = auth.split(" ", 1)[1].strip()
        tenant_id = os.getenv("AZURE_TENANT_ID") or ""
        api_app_id = os.getenv("FUNCTION_API_APP_ID") or ""
        if not tenant_id or not api_app_id:
            return _json({"error": "Function app missing AZURE_TENANT_ID or FUNCTION_API_APP_ID"}, status=500)
        try:
            claims = decode_and_validate_access_token(token, tenant_id=tenant_id, api_app_id=api_app_id)
            caller_email_from_claims(claims)
        except Exception as e:
            return _json({"error": f"Unauthorized: {e}"}, status=401)

        try:
            body = req.get_json()
        except Exception:
            body = {}
        if not isinstance(body, dict):
            body = {}

        mode = str(body.get("mode") or "").strip().lower()
        if mode not in ("create", "reimport"):
            return _json({"error": 'mode must be "create" or "reimport"'}, status=400)

        b64 = body.get("pdfBase64")
        if not isinstance(b64, str) or not b64.strip():
            return _json({"error": "pdfBase64 is required"}, status=400)

        raw = base64.b64decode(b64)
        if not raw or len(raw) < 64:
            return _json({"error": "Decoded PDF is empty or too small"}, status=400)

        filename = str(body.get("filename") or "upload.pdf").strip()
        filename = os.path.basename(filename.replace("\\", "/"))
        if not filename.lower().endswith(".pdf"):
            filename = filename + ".pdf"

        hub = os.getenv("HUB_NAME") or ""
        if not hub:
            return _json({"error": "Missing HUB_NAME"}, status=500)

        authenticate()
        site_id = get_site_id(hub)
        procedures_list_title = (os.getenv("LIST_PROCEDURECHECKLIST") or "LOPProcedureChecklist").strip()
        procedures_list_id = get_list_id(site_id, procedures_list_title)
        if not procedures_list_id:
            return _json({"error": "Could not resolve procedure checklist list id"}, status=500)

        procedure_list_item_id: int | None = None
        category = str(body.get("category") or "").strip()

        if mode == "reimport":
            try:
                procedure_list_item_id = int(body.get("procedureId"))
            except (TypeError, ValueError):
                return _json({"error": "procedureId must be an integer for reimport"}, status=400)
            item = get_list_item(
                site_id,
                procedures_list_id,
                procedure_list_item_id,
                fields_select=["Category"],
            )
            fields = item.get("fields") or {}
            if not category:
                category = str(fields.get("Category") or "").strip()
            if not category:
                category = "Uncategorized"
        else:
            if not category:
                category = "Uncategorized"

        field_overrides: dict[str, str] = {}
        for k in ("title", "purpose", "category", "effectiveDate"):
            v = body.get(k)
            if isinstance(v, str) and v.strip():
                field_overrides[k] = v.strip()
        if field_overrides.get("category"):
            category = field_overrides["category"]

        tmp_root = tempfile.mkdtemp(prefix="lop_pc_")
        img_dir = os.path.join(tmp_root, "img")
        os.makedirs(img_dir, exist_ok=True)
        pdf_path = os.path.join(tmp_root, filename)
        with open(pdf_path, "wb") as f:
            f.write(raw)

        from .lop.procedure_checklist.ProcedureChecklist import ProcedureChecklist as ProcedureChecklistModel

        force_new = mode == "create"
        proc_id_arg = procedure_list_item_id if mode == "reimport" else None

        pc = ProcedureChecklistModel(
            pdf_path,
            category,
            tmp_root,
            procedure_list_item_id=proc_id_arg,
            force_new_list_item=force_new,
        )
        new_id = pc.run(field_overrides=field_overrides or None)

        out_id: int | None = None
        if isinstance(new_id, int) and new_id > 0:
            out_id = new_id
        elif mode == "reimport" and procedure_list_item_id:
            out_id = procedure_list_item_id

        return _json(
            {
                "procedureId": out_id,
                "documentURL": pc.document_URL,
                "jsonURL": pc.json_URL,
                "pageCount": len(pc.pages),
                "title": _as_title(pc),
                "category": pc.category,
                "filename": pc.filename,
            }
        )
    except Exception as e:
        log.exception("LopProcedureChecklistImport failed")
        return _json({"error": str(e)}, status=500)
    finally:
        if tmp_root:
            try:
                shutil.rmtree(tmp_root, ignore_errors=True)
            except Exception:
                pass
