"""
Portal Assignments — user mutations via Microsoft Graph (app-only), authorized by
the caller's Entra access token (delegated) from SPFx AadHttpClient.

POST JSON body:
  { "action": "start" | "progress" | "final_embed" | "complete", "assignmentId": <int>, "currentStepOrder"?: <int> }
"""

from __future__ import annotations

import json
import os
import logging
from datetime import datetime, timezone
from typing import Any

import azure.functions as func

from .entra_jwt import caller_email_from_claims, decode_and_validate_access_token
from .local_upload import (
    authenticate,
    get_list_id,
    get_list_item,
    get_list_items,
    get_list_column_names,
    get_site_id,
    lookup_id_field,
    odata_escape,
    upsert_list_item,
    update_list_item,
)


def _json_response(body: dict[str, Any], *, status: int = 200) -> func.HttpResponse:
    return func.HttpResponse(
        json.dumps(body),
        status_code=status,
        mimetype="application/json",
    )

def _debug_enabled() -> bool:
    return str(os.getenv("DEBUG_PORTAL_ASSIGNMENTS_MUTATE") or "").strip().lower() in ("1", "true", "yes", "y")


def _truthy(v: Any) -> bool:
    if v is True:
        return True
    if v is False or v is None:
        return False
    if isinstance(v, (int, float)):
        return v != 0
    if isinstance(v, str):
        s = v.strip().lower()
        return s in ("true", "yes", "1", "y")
    return bool(v)


def _normalize_percent_ui(raw: Any) -> int | None:
    if raw is None:
        return None
    try:
        n = float(raw)
    except (TypeError, ValueError):
        return None
    if not n == n:  # NaN
        return None
    while n > 100:
        n /= 100.0
    if 0 < n <= 1:
        return int(round(n * 100))
    return int(round(n))


def _percent_ui_to_graph(ui: int) -> float:
    c = max(0, min(100, int(ui)))
    return c / 100.0


def _parse_iso_date(due: str | None) -> datetime | None:
    if not due or not isinstance(due, str):
        return None
    try:
        return datetime.fromisoformat(due.replace("Z", "+00:00"))
    except ValueError:
        return None


def _is_past_due(due_iso: str | None) -> bool:
    d = _parse_iso_date(due_iso)
    if not d:
        return False
    today = datetime.now(timezone.utc).date()
    return d.date() < today


def _status_field_name() -> str:
    return (os.getenv("INTERNALCOLUMN_ASSIGNMENTSTATUS") or "Status").strip()


def _embed_field_name_optional() -> str:
    """Only when this env var is set do we $select / PATCH the final-embed flag column."""
    return (os.getenv("INTERNALCOLUMN_FINALEMBEDCOMPLETED") or "").strip()

def _quiz_lists() -> tuple[str, str]:
    return (
        (os.getenv("LIST_ASSIGNMENTQUIZQUESTIONS") or "AssignmentQuizQuestions").strip(),
        (os.getenv("LIST_ASSIGNMENTQUIZATTEMPTS") or "AssignmentQuizAttempts").strip(),
    )

def _resolve_first(existing: list[str], candidates: list[str]) -> str | None:
    s = set(existing)
    for c in candidates:
        if c in s:
            return c
    return None


def _catalog_lookup_field() -> str:
    # In this tenant the lookup column internal name is the base field name.
    # (No "...LookupId" shadow field exists.)
    return "AssignmentCatalogId"


def _assignment_select_fields(status_col: str, embed_col: str) -> list[str]:
    cols = [
        "EmployeeEmail",
        "DueDate",
        "CurrentStepOrder",
        "PercentComplete",
        "LastOpenedOn",
        "CompletedOn",
        status_col,
        "Status",
        "AssignmentStatus",
        _catalog_lookup_field(),
    ]
    if embed_col:
        cols.append(embed_col)
    seen: set[str] = set()
    out: list[str] = []
    for c in cols:
        c = str(c).strip()
        if not c or c in seen:
            continue
        seen.add(c)
        out.append(c)
    return out


def _read_status(fields: dict[str, Any], status_col: str) -> str:
    return str(
        fields.get(status_col)
        or fields.get("Status")
        or fields.get("AssignmentStatus")
        or ""
    ).strip()


def _is_completed_status(s: str) -> bool:
    return s.strip().lower() == "completed"


def _workflow_status(due_iso: str | None) -> str:
    """Status for in-flight user work: past due stays Overdue; otherwise In Progress."""
    return "Overdue" if _is_past_due(due_iso) else "In Progress"

def _odata_number(n: int | float) -> str:
    """
    SharePoint 'Number' columns come through Graph as doubles.
    In some tenants, `$filter fields/Foo eq 2` fails while `eq 2.0` works.
    Normalize numeric filter literals to a float string.
    """
    try:
        return str(float(n))
    except (TypeError, ValueError):
        return str(n)


def _max_step_order(site_id: str, steps_list_id: str, catalog_lookup_id: int) -> int:
    rows = get_list_items(
        site_id,
        steps_list_id,
        fields_filter=f"fields/AssignmentCatalogId eq {_odata_number(catalog_lookup_id)}",
        top=999,
        fields_select=["StepOrder"],
    )
    m = 1
    for r in rows:
        f = r.get("fields") or {}
        so = f.get("StepOrder")
        if so is not None:
            try:
                m = max(m, int(so))
            except (TypeError, ValueError):
                continue
    return m


def _final_step_fields(
    site_id: str, steps_list_id: str, catalog_lookup_id: int, max_order: int
) -> dict[str, Any]:
    rows = get_list_items(
        site_id,
        steps_list_id,
        fields_filter=f"fields/AssignmentCatalogId eq {_odata_number(catalog_lookup_id)}",
        top=999,
        fields_select=["StepOrder", "RequireEmbedCompletion", "AllowMarkCompleteHere", "StepTitle"],
    )
    for r in rows:
        f = r.get("fields") or {}
        try:
            if int(f.get("StepOrder") or 0) == max_order:
                return f
        except (TypeError, ValueError):
            continue
    return {}


def _catalog_fields(site_id: str, catalog_list_id: str, catalog_item_id: int) -> dict[str, Any]:
    body = get_list_item(
        site_id,
        catalog_list_id,
        catalog_item_id,
        fields_select=["FinalStepCompletionMode", "QuizPassingScore", "Title"],
    )
    return body.get("fields") or {}


def _assignment_payload(
    *,
    site_id: str,
    assignments_list_id: str,
    item_id: int,
    status_col: str,
    embed_col: str,
) -> dict[str, Any]:
    sel = _assignment_select_fields(status_col, embed_col)
    body = get_list_item(site_id, assignments_list_id, item_id, fields_select=sel)
    f = body.get("fields") or {}
    raw_embed = f.get(embed_col) if embed_col else None
    return {
        "id": int(body.get("id") or item_id),
        "employeeEmail": f.get("EmployeeEmail"),
        "dueDate": f.get("DueDate"),
        "currentStepOrder": f.get("CurrentStepOrder"),
        "percentComplete": _normalize_percent_ui(f.get("PercentComplete")),
        "lastOpenedOn": f.get("LastOpenedOn"),
        "completedOn": f.get("CompletedOn"),
        "status": _read_status(f, status_col),
        "finalEmbedCompleted": _truthy(raw_embed) if embed_col else False,
    }

def _quiz_questions(site_id: str, quiz_questions_list_id: str, catalog_item_id: int) -> list[dict[str, Any]]:
    rows = get_list_items(
        site_id,
        quiz_questions_list_id,
        fields_filter=f"fields/AssignmentCatalogId eq {_odata_number(catalog_item_id)} and fields/Active eq true",
        top=999,
        fields_select=[
            "QuestionOrder",
            "QuestionText",
            "QuestionType",
            "ChoicesText",
            "CorrectAnswer",
        ],
    )
    out: list[dict[str, Any]] = []
    for r in rows:
        f = r.get("fields") or {}
        try:
            order = int(f.get("QuestionOrder") or 0)
        except (TypeError, ValueError):
            order = 0
        if order <= 0:
            continue
        qtext = str(f.get("QuestionText") or "").strip()
        if not qtext:
            continue
        out.append({**f, "QuestionOrder": order})
    out.sort(key=lambda x: int(x.get("QuestionOrder") or 0))
    return out

def _score_quiz(
    questions: list[dict[str, Any]],
    answers_by_order: dict[int, str],
) -> tuple[int, bool]:
    """
    - MultipleChoice: graded by matching CorrectAnswer (trimmed, case-insensitive)
    - OpenAnswer: auto-correct (ungraded). Counts as correct even if blank.
    """
    if not questions:
        return 0, False
    total = 0
    correct = 0
    for q in questions:
        try:
            order = int(q.get("QuestionOrder") or 0)
        except (TypeError, ValueError):
            continue
        qtype = str(q.get("QuestionType") or "MultipleChoice").strip()
        if qtype.lower().replace(" ", "") == "openanswer":
            # ungraded (auto-correct)
            total += 1
            correct += 1
            continue
        ans = str(answers_by_order.get(order, "") or "").strip()
        if not ans:
            continue
        total += 1
        expected = str(q.get("CorrectAnswer") or "").strip()
        if expected and expected.lower() == ans.lower():
            correct += 1
    if total <= 0:
        return 0, False
    score = int(round((correct / total) * 100))
    return score, True


def _require_owner(fields: dict[str, Any], caller_email: str) -> None:
    owner = str(fields.get("EmployeeEmail") or "").strip().lower()
    if not owner or owner != caller_email.strip().lower():
        raise PermissionError("Assignment is not assigned to the signed-in user.")

def _parse_answers_by_order(raw: Any) -> dict[int, str]:
    """
    Accept the portal payload in a few common shapes:
      - {"1": "A", "2": "some text"}
      - {1: "A"}
      - {"1": {"value": "A"}} (or {"answer": "A"})
      - [{"questionOrder": 1, "answer": "A"}]
    Returns a dict keyed by QuestionOrder (int).
    """
    out: dict[int, str] = {}
    if raw is None:
        return out

    if isinstance(raw, list):
        for row in raw:
            if not isinstance(row, dict):
                continue
            qo = row.get("questionOrder") or row.get("order") or row.get("QuestionOrder")
            try:
                order = int(qo)
            except (TypeError, ValueError):
                continue
            v = row.get("answer") if "answer" in row else row.get("value")
            out[order] = str(v or "").strip()
        return out

    if not isinstance(raw, dict):
        return out

    for k, v in raw.items():
        try:
            order = int(k)
        except (TypeError, ValueError):
            continue
        if isinstance(v, dict):
            v = v.get("answer") if "answer" in v else v.get("value")
        out[order] = str(v or "").strip()
    return out


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
            caller_email = caller_email_from_claims(claims)
        except Exception as e:
            return _json_response({"error": f"Unauthorized: {e}"}, status=401)

        try:
            body = req.get_json()
        except Exception:
            body = {}
        if not isinstance(body, dict):
            body = {}

        action = str(body.get("action") or "").strip().lower()
        assignment_id = body.get("assignmentId")
        try:
            item_id = int(assignment_id)
        except (TypeError, ValueError):
            return _json_response({"error": "assignmentId must be an integer"}, status=400)

        if action not in ("start", "progress", "final_embed", "complete", "submit_quiz"):
            return _json_response(
                {"error": "action must be one of: start, progress, final_embed, complete, submit_quiz"},
                status=400,
            )

        authenticate()

        hub = os.getenv("HUB_NAME") or ""
        if not hub:
            return _json_response({"error": "Missing HUB_NAME"}, status=500)
        site_id = get_site_id(hub)

        assignments_title = os.getenv("LIST_ASSIGNMENTS") or "Assignments"
        steps_title = os.getenv("LIST_ASSIGNMENTSTEPS") or "AssignmentSteps"
        catalog_title = os.getenv("LIST_ASSIGNMENTCATALOG") or "AssignmentCatalog"
        quiz_q_title, quiz_a_title = _quiz_lists()

        assignments_list_id = get_list_id(site_id, assignments_title)
        steps_list_id = get_list_id(site_id, steps_title)
        catalog_list_id = get_list_id(site_id, catalog_title)
        quiz_questions_list_id = get_list_id(site_id, quiz_q_title)
        quiz_attempts_list_id = get_list_id(site_id, quiz_a_title)
        if not assignments_list_id or not steps_list_id or not catalog_list_id:
            return _json_response({"error": "Could not resolve list id(s) from env titles"}, status=500)

        status_col = _status_field_name()
        embed_opt = _embed_field_name_optional()
        sel = _assignment_select_fields(status_col, embed_opt)
        item = get_list_item(site_id, assignments_list_id, item_id, fields_select=sel)
        fields: dict[str, Any] = item.get("fields") or {}

        _require_owner(fields, caller_email)

        current_status = _read_status(fields, status_col)
        if _is_completed_status(current_status):
            if action == "complete":
                view = _assignment_payload(
                    site_id=site_id,
                    assignments_list_id=assignments_list_id,
                    item_id=item_id,
                    status_col=status_col,
                    embed_col=embed_opt,
                )
                return _json_response({"assignment": view})
            return _json_response({"error": "Assignment is completed"}, status=409)

        due_iso = fields.get("DueDate")
        if isinstance(due_iso, str):
            pass
        else:
            due_iso = None

        cat_key = _catalog_lookup_field()
        cat_lookup_raw = fields.get(cat_key)
        try:
            catalog_item_id = int(cat_lookup_raw)
        except (TypeError, ValueError):
            return _json_response({"error": "Assignment is missing catalog lookup"}, status=400)

        now_iso = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

        if action == "submit_quiz":
            if not quiz_questions_list_id or not quiz_attempts_list_id:
                return _json_response({"error": "Quiz lists not found (AssignmentQuizQuestions / AssignmentQuizAttempts)."}, status=500)
            assignment_fk = "AssignmentId"

            # must be on final step
            max_order = _max_step_order(site_id, steps_list_id, catalog_item_id)
            cur = fields.get("CurrentStepOrder")
            try:
                cur_i = int(cur) if cur is not None else 0
            except (TypeError, ValueError):
                cur_i = 0
            if cur_i < max_order:
                return _json_response({"error": "Quiz can only be submitted on the final step."}, status=400)

            raw_answers = body.get("answers")
            answers_by_order = _parse_answers_by_order(raw_answers)
            log.info(
                "submit_quiz assignmentId=%s catalogItemId=%s answers_type=%s parsed_answer_keys=%s",
                item_id,
                catalog_item_id,
                type(raw_answers).__name__,
                sorted(list(answers_by_order.keys())),
            )

            questions = _quiz_questions(site_id, quiz_questions_list_id, catalog_item_id)
            log.info(
                "submit_quiz fetched_questions=%s question_orders=%s",
                len(questions),
                [q.get("QuestionOrder") for q in questions],
            )
            score, has_graded = _score_quiz(questions, answers_by_order)
            if not has_graded:
                if _debug_enabled():
                    return _json_response(
                        {
                            "error": "No valid quiz answers submitted.",
                            "debug": {
                                "assignmentId": item_id,
                                "catalogItemId": catalog_item_id,
                                "rawAnswersType": type(raw_answers).__name__,
                                "parsedAnswerKeys": sorted(list(answers_by_order.keys())),
                                "parsedAnswers": answers_by_order,
                                "fetchedQuestionCount": len(questions),
                                "fetchedQuestions": [
                                    {
                                        "QuestionOrder": q.get("QuestionOrder"),
                                        "QuestionType": q.get("QuestionType"),
                                        "QuestionText": q.get("QuestionText"),
                                        "CorrectAnswer": q.get("CorrectAnswer"),
                                    }
                                    for q in questions
                                ],
                            },
                        },
                        status=400,
                    )
                return _json_response({"error": "No valid quiz answers submitted."}, status=400)

            cat_fields = _catalog_fields(site_id, catalog_list_id, catalog_item_id)
            passing = cat_fields.get("QuizPassingScore")
            try:
                passing_i = int(passing) if passing is not None else 70
            except (TypeError, ValueError):
                passing_i = 70
            passed = score >= passing_i

            # record attempt (upsert latest per assignment+employee)
            attempt_fields = {
                "Title": f"{item_id} - {caller_email}",
                assignment_fk: item_id,
                "EmployeeEmail": caller_email,
                "ScorePercent": score,
                "Passed": passed,
                "SubmittedOn": now_iso,
            }
            upsert_list_item(
                site_id,
                quiz_attempts_list_id,
                unique_filter=f"fields/EmployeeEmail eq '{odata_escape(caller_email)}' and fields/{assignment_fk} eq {item_id}",
                field_data=attempt_fields,
                fields_select=["EmployeeEmail"],
            )

            # If mode allows auto-complete after quiz pass, do it here.
            mode = str(cat_fields.get("FinalStepCompletionMode") or "").strip()
            if passed and mode.lower() in ("afterquizpass",):
                update_list_item(
                    site_id,
                    assignments_list_id,
                    item_id,
                    {
                        status_col: "Completed",
                        "CompletedOn": now_iso,
                        "PercentComplete": _percent_ui_to_graph(100),
                        "LastOpenedOn": now_iso,
                    },
                )

            view = _assignment_payload(
                site_id=site_id,
                assignments_list_id=assignments_list_id,
                item_id=item_id,
                status_col=status_col,
                embed_col=embed_opt,
            )
            return _json_response(
                {
                    "assignment": view,
                    "attempt": {
                        "scorePercent": score,
                        "passed": passed,
                        "submittedOn": now_iso,
                    },
                }
            )

        if action == "start":
            next_status = _workflow_status(due_iso)
            patch: dict[str, Any] = {
                "LastOpenedOn": now_iso,
                status_col: next_status,
            }
            update_list_item(site_id, assignments_list_id, item_id, patch)
            view = _assignment_payload(
                site_id=site_id,
                assignments_list_id=assignments_list_id,
                item_id=item_id,
                status_col=status_col,
                embed_col=embed_opt,
            )
            return _json_response({"assignment": view})

        if action == "final_embed":
            if not embed_opt:
                return _json_response(
                    {
                        "error": "Configure INTERNALCOLUMN_FINALEMBEDCOMPLETED to your list column internal name "
                        "(Yes/No) before calling final_embed.",
                    },
                    status=400,
                )
            next_status = _workflow_status(due_iso)
            patch = {embed_opt: True, status_col: next_status, "LastOpenedOn": now_iso}
            update_list_item(site_id, assignments_list_id, item_id, patch)
            view = _assignment_payload(
                site_id=site_id,
                assignments_list_id=assignments_list_id,
                item_id=item_id,
                status_col=status_col,
                embed_col=embed_opt,
            )
            return _json_response({"assignment": view})

        if action == "progress":
            step_raw = body.get("currentStepOrder")
            try:
                next_order = int(step_raw)
            except (TypeError, ValueError):
                return _json_response({"error": "currentStepOrder is required for progress"}, status=400)
            if next_order < 1:
                return _json_response({"error": "currentStepOrder must be >= 1"}, status=400)

            max_order = _max_step_order(site_id, steps_list_id, catalog_item_id)
            if next_order > max_order:
                return _json_response({"error": "currentStepOrder exceeds configured steps"}, status=400)

            prev_max = fields.get("CurrentStepOrder")
            try:
                prev_i = int(prev_max) if prev_max is not None else 0
            except (TypeError, ValueError):
                prev_i = 0
            merged_max = max(prev_i, next_order)
            ui_pct = int(round((merged_max / max_order) * 100)) if max_order > 0 else 0

            next_status = _workflow_status(due_iso)
            patch = {
                "CurrentStepOrder": next_order,
                "PercentComplete": _percent_ui_to_graph(ui_pct),
                "LastOpenedOn": now_iso,
                status_col: next_status,
            }
            update_list_item(site_id, assignments_list_id, item_id, patch)
            view = _assignment_payload(
                site_id=site_id,
                assignments_list_id=assignments_list_id,
                item_id=item_id,
                status_col=status_col,
                embed_col=embed_opt,
            )
            return _json_response({"assignment": view})

        # complete
        max_order = _max_step_order(site_id, steps_list_id, catalog_item_id)
        cur = fields.get("CurrentStepOrder")
        try:
            cur_i = int(cur) if cur is not None else 0
        except (TypeError, ValueError):
            cur_i = 0
        if cur_i < max_order:
            return _json_response({"error": "Assignment is not on the final step"}, status=400)

        final_fields = _final_step_fields(site_id, steps_list_id, catalog_item_id, max_order)
        cat_fields = _catalog_fields(site_id, catalog_list_id, catalog_item_id)
        mode = str(cat_fields.get("FinalStepCompletionMode") or "")

        mode_l = mode.strip().lower()
        require_embed = mode_l in ("afterfinalembed", "afterfinalembedandquizpass") or _truthy(final_fields.get("RequireEmbedCompletion"))
        require_quiz = mode_l in ("afterquizpass", "afterfinalembedandquizpass")
        allow_here = _truthy(final_fields.get("AllowMarkCompleteHere")) if final_fields else True
        if not allow_here:
            return _json_response({"error": "Final step does not allow completion here"}, status=400)

        if require_embed:
            if not embed_opt:
                return _json_response(
                    {"error": "Final embed is required but INTERNALCOLUMN_FINALEMBEDCOMPLETED is not configured"},
                    status=500,
                )
            if not _truthy(fields.get(embed_opt)):
                return _json_response({"error": "Final embed completion is required before completing"}, status=400)

        if require_quiz:
            if not quiz_attempts_list_id:
                return _json_response({"error": "Quiz attempts list not found."}, status=500)
            assignment_fk = "AssignmentId"
            # require latest attempt passed
            rows = get_list_items(
                site_id,
                quiz_attempts_list_id,
                fields_filter=f"fields/EmployeeEmail eq '{odata_escape(caller_email)}' and fields/{assignment_fk} eq {_odata_number(item_id)} and fields/Passed eq true",
                top=1,
                fields_select=["Passed"],
            )
            if not rows:
                return _json_response({"error": "Quiz must be submitted and passed before completing."}, status=400)

        patch = {
            status_col: "Completed",
            "CompletedOn": now_iso,
            "PercentComplete": _percent_ui_to_graph(100),
            "LastOpenedOn": now_iso,
        }
        update_list_item(site_id, assignments_list_id, item_id, patch)
        view = _assignment_payload(
            site_id=site_id,
            assignments_list_id=assignments_list_id,
            item_id=item_id,
            status_col=status_col,
            embed_col=embed_opt,
        )
        return _json_response({"assignment": view})

    except PermissionError as e:
        return _json_response({"error": str(e)}, status=403)
    except Exception as e:
        return _json_response({"error": str(e)}, status=500)
