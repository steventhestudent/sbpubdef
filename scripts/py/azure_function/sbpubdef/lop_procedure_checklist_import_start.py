"""
Fast-start import:
- upload PDF to SharePoint drive
- create/update LIST_PROCEDURECHECKLIST immediately (json='PENDING')
- enqueue/background processing is handled by a timer-trigger worker

POST JSON:
  mode: "create" | "reimport"
  pdfBase64: base64 PDF
  filename: original file name
  category?: string
  procedureId?: number (required for reimport)
  title?, purpose?, effectiveDate?: optional immediate overrides
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
from .local_upload import (
    authenticate,
    get_drive_id,
    get_list_id,
    get_list_item,
    get_site_id,
    upload_file,
    update_list_item,
    add_list_item,
)


def _json(body: dict[str, Any], *, status: int = 200) -> func.HttpResponse:
    return func.HttpResponse(json.dumps(body), status_code=status, mimetype="application/json")


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
        filename_no_ext = filename[:-4]

        hub = os.getenv("HUB_NAME") or ""
        if not hub:
            return _json({"error": "Missing HUB_NAME"}, status=500)

        authenticate()
        site_id = get_site_id(hub)
        drive_id = get_drive_id(site_id, "user_uploads")
        if not drive_id:
            return _json({"error": "Could not resolve drive id for 'user_uploads'."}, status=500)

        procedures_list_title = (os.getenv("LIST_PROCEDURECHECKLIST") or "LOPProcedureChecklist").strip()
        procedures_list_id = get_list_id(site_id, procedures_list_title)
        if not procedures_list_id:
            return _json({"error": "Could not resolve procedure checklist list id"}, status=500)

        # Determine category for reimport default
        procedure_id: int | None = None
        category = str(body.get("category") or "").strip()
        if mode == "reimport":
            try:
                procedure_id = int(body.get("procedureId"))
            except (TypeError, ValueError):
                return _json({"error": "procedureId must be an integer for reimport"}, status=400)
            if not category:
                item = get_list_item(site_id, procedures_list_id, procedure_id, fields_select=["Category"])
                category = str((item.get("fields") or {}).get("Category") or "").strip()
        if not category:
            category = "Uncategorized"

        # Write temp PDF, upload it, then upsert list item quickly.
        tmp_root = tempfile.mkdtemp(prefix="lop_pc_start_")
        pdf_path = os.path.join(tmp_root, filename)
        with open(pdf_path, "wb") as f:
            f.write(raw)

        doc_url = upload_file(site_id, drive_id, pdf_path, "resource/LOP/ProcedureChecklist")

        title = str(body.get("title") or "").strip() or filename_no_ext
        purpose = str(body.get("purpose") or "").strip()
        effective_date = str(body.get("effectiveDate") or "").strip()

        fields = {
            "Title": title,
            "Purpose": purpose,
            "Category": category,
            "DocumentURL": doc_url,
            "Filename": filename_no_ext,
            "EffectiveDate": effective_date or None,
            "PageCount": 0,
            # signal to worker
            "json": "PENDING",
        }
        # Remove None values (Graph rejects for some column types)
        fields = {k: v for k, v in fields.items() if v is not None}

        out_id: int | None = None
        if mode == "reimport" and procedure_id is not None:
            update_list_item(site_id, procedures_list_id, procedure_id, fields)
            out_id = procedure_id
        else:
            created = add_list_item(site_id, procedures_list_id, fields)
            try:
                out_id = int(created.get("id")) if isinstance(created, dict) and created.get("id") else None
            except Exception:
                out_id = None

        if not out_id:
            return _json({"error": "Failed to create procedure checklist item."}, status=500)

        return _json(
            {
                "procedureId": out_id,
                "documentURL": doc_url,
                "status": "PENDING",
            }
        )
    except Exception as e:
        log.exception("LopProcedureChecklistImportStart failed")
        return _json({"error": str(e)}, status=500)
    finally:
        if tmp_root:
            try:
                shutil.rmtree(tmp_root, ignore_errors=True)
            except Exception:
                pass

