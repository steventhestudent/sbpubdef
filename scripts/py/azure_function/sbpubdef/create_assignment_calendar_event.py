"""
Create Outlook calendar events for Assignments created by CMS.

- Called from SPFx via AadHttpClient (delegated), but the function performs app-only
  Microsoft Graph calls to create events in assignees' mailboxes.
- The caller token is validated to ensure the request comes from our tenant/app.

POST JSON body:
  {
    "events": [
      {
        "assigneeEmail": "user@contoso.com",
        "assignmentItemId": 123,
        "catalogId": 45,
        "title": "Complete training",
        "dueDate": "2026-04-30",
        "assignmentUrl": "https://.../Lists/Assignments/DispForm.aspx?ID=123"
      }
    ]
  }
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

import azure.functions as func
import requests

from .entra_jwt import caller_email_from_claims, decode_and_validate_access_token
from .local_upload import authenticate, session_headers


def _json_response(body: dict[str, Any], *, status: int = 200) -> func.HttpResponse:
    return func.HttpResponse(
        json.dumps(body),
        status_code=status,
        mimetype="application/json",
    )


def _parse_due_date(due_ymd: str | None) -> tuple[str, str]:
    """
    Convert YYYY-MM-DD into Graph event start/end ISO strings (UTC).

    We use an all-day event by representing a midnight-to-midnight window.
    """
    if not due_ymd or not isinstance(due_ymd, str):
        raise ValueError("Missing dueDate (expected YYYY-MM-DD).")
    try:
        d = datetime.strptime(due_ymd.strip(), "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError as e:
        raise ValueError("Invalid dueDate (expected YYYY-MM-DD).") from e
    start = d.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    return start.isoformat().replace("+00:00", "Z"), end.isoformat().replace("+00:00", "Z")


def _marker(*, assignment_item_id: int, catalog_id: int | None) -> str:
    cid = str(int(catalog_id)) if catalog_id is not None else ""
    return f"sbpubdef:source=assignment;assignmentItemId={int(assignment_item_id)};catalogId={cid};"


def _create_event_for_user(
    *,
    assignee_email: str,
    title: str,
    due_date: str,
    assignment_item_id: int,
    catalog_id: int | None,
    assignment_url: str | None,
) -> dict[str, Any]:
    if not session_headers.get("Authorization"):
        raise RuntimeError("Missing Graph Authorization header (authenticate() not called).")

    start_iso, end_iso = _parse_due_date(due_date)
    marker = _marker(assignment_item_id=assignment_item_id, catalog_id=catalog_id)

    safe_user = requests.utils.quote(assignee_email.strip(), safe="")
    url = f"https://graph.microsoft.com/v1.0/users/{safe_user}/events"

    body_parts = [
        f"<div>{marker}</div>",
        "<p>Assignment created from CMS.</p>",
    ]
    if assignment_url:
        body_parts.append(f'<p><a href="{assignment_url}">Open assignment</a></p>')
    body_html = "".join(body_parts)

    payload = {
        "subject": title,
        "isAllDay": True,
        "start": {"dateTime": start_iso, "timeZone": "UTC"},
        "end": {"dateTime": end_iso, "timeZone": "UTC"},
        "body": {"contentType": "HTML", "content": body_html},
    }

    resp = requests.post(
        url,
        headers={**session_headers, "Content-Type": "application/json"},
        json=payload,
    )
    if resp.status_code >= 300:
        raise Exception(f"Graph create event failed: {resp.status_code} - {resp.text}")
    data = resp.json()
    return {
        "assigneeEmail": assignee_email,
        "outlookEventId": data.get("id"),
        "webLink": data.get("webLink"),
    }


def main(req: func.HttpRequest) -> func.HttpResponse:
    try:
        log = logging.getLogger(__name__)
        auth = req.headers.get("Authorization") or ""
        if not auth.lower().startswith("bearer "):
            return _json_response({"error": "Missing Authorization: Bearer token"}, status=401)
        token = auth.split(" ", 1)[1].strip()

        tenant_id = os.getenv("AZURE_TENANT_ID") or ""
        api_app_id = os.getenv("FUNCTION_API_APP_ID") or ""
        if not tenant_id or not api_app_id:
            return _json_response({"error": "Function app missing AZURE_TENANT_ID or FUNCTION_API_APP_ID"}, status=500)

        try:
            claims = decode_and_validate_access_token(token, tenant_id=tenant_id, api_app_id=api_app_id)
            _caller = caller_email_from_claims(claims)
        except Exception as e:
            return _json_response({"error": f"Unauthorized: {e}"}, status=401)

        try:
            body = req.get_json()
        except Exception:
            body = {}
        if not isinstance(body, dict):
            body = {}

        rows = body.get("events")
        if not isinstance(rows, list) or len(rows) == 0:
            return _json_response({"error": "Missing events[]"}, status=400)

        authenticate()

        created: list[dict[str, Any]] = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            assignee = str(row.get("assigneeEmail") or "").strip().lower()
            title = str(row.get("title") or "").strip()
            due = str(row.get("dueDate") or "").strip()
            assignment_item_id = row.get("assignmentItemId")
            catalog_id = row.get("catalogId")
            assignment_url = str(row.get("assignmentUrl") or "").strip() or None
            if not assignee or "@" not in assignee:
                continue
            if not title:
                continue
            try:
                item_id = int(assignment_item_id)
            except (TypeError, ValueError):
                continue
            cid: int | None
            try:
                cid = int(catalog_id) if catalog_id is not None else None
            except (TypeError, ValueError):
                cid = None

            log.info("create_assignment_calendar_event assignee=%s assignmentItemId=%s", assignee, item_id)
            created.append(
                _create_event_for_user(
                    assignee_email=assignee,
                    title=f"Assignment due: {title}",
                    due_date=due,
                    assignment_item_id=item_id,
                    catalog_id=cid,
                    assignment_url=assignment_url,
                )
            )

        return _json_response({"success": True, "created": created})

    except Exception as e:
        return _json_response({"error": str(e)}, status=500)

