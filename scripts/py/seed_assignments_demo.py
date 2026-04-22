"""
Seed realistic dev/demo data for:
  - AssignmentCatalog
  - AssignmentSteps
  - Assignments

Idempotent behavior:
  - Catalog items upsert by Title
  - Steps upsert by (AssignmentCatalogIdLookupId, StepOrder)
  - Assignments upsert by (EmployeeEmail, AssignmentCatalogIdLookupId)

Usage (from repo root):
  python3 -m scripts.py.seed_assignments_demo

Notes:
  - Uses Graph app-only auth via scripts/py/azure_function/sbpubdef/local_upload helpers.
  - Does NOT set SharePoint Person fields (Employee/AssignedBy) since we don't have user resolution helpers.
"""

from __future__ import annotations

import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Any

# Ensure `scripts/py` is on sys.path so `azure_function.*` imports work when run from repo root.
_THIS_DIR = Path(__file__).resolve().parent
if str(_THIS_DIR) not in sys.path:
    sys.path.insert(0, str(_THIS_DIR))

from azure_function.sbpubdef.local_upload import (
    os,
    authenticate,
    get_site_id,
    get_list_id,
    get_list_column_names,
    odata_escape,
    upsert_list_item,
    lookup_id_field,
    update_list_item,
    get_sharepoint_user_lookup_id,
)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def env_required(name: str) -> str:
    v = os.getenv(name)
    if not v:
        raise Exception(f"Missing required env var: {name}")
    return v


def ensure_list(site_id: str, env_name: str, fallback_title: str) -> tuple[str, str]:
    title = os.getenv(env_name) or fallback_title
    list_id = get_list_id(site_id, title)
    if not list_id:
        # In dev, list title may have been renamed. Print what exists to help.
        raise Exception(f"List not found by name='{title}' (env {env_name}).")
    return title, list_id


def catalog_seed_rows() -> list[dict[str, Any]]:
    # Keep the fields aligned to likely SharePoint column internal names.
    # If some columns don't exist yet, Graph will reject the request — so keep this tight.
    return [
        {
            "Title": "Sexual Harassment Prevention",
            "AssignmentKey": "sexual-harassment-prevention",
            "AssignmentType": "Training",
            "Category": "Compliance",
            "Summary": "Annual prevention training covering prohibited conduct, reporting obligations, and office expectations.",
            "Instructions": (
                "<p><strong>Goal:</strong> Ensure all staff understand prohibited conduct and how to report concerns.</p>"
                "<ul>"
                "<li>Work through each step in order.</li>"
                "<li>On the final step, watch the short recap video to unlock completion.</li>"
                "</ul>"
            ),
            "Active": True,
            # TargetMode is a checkbox-choice in this dev list -> must be a string collection.
            "TargetMode@odata.type": "Collection(Edm.String)",
            "TargetMode": ["Roles"],
            # SharePoint checkbox-choice fields via Graph require the OData type annotation.
            "TargetRoles@odata.type": "Collection(Edm.String)",
            "TargetRoles": [
                "ATTORNEY",
                "CDD",
                "LOP",
                "TRIALSUPERVISOR",
                "HR",
                "COMPLIANCEOFFICER",
                "IT",
            ],
            "TargetRoles0@odata.type": "Collection(Edm.String)",
            "TargetRoles0": [
                "ATTORNEY",
                "CDD",
                "LOP",
                "TRIALSUPERVISOR",
                "HR",
                "COMPLIANCEOFFICER",
                "IT",
            ],
            "DueDaysAfterAssigned": 14,
            "CreateCalendarEvent": True,
            "SendAssignmentEmail": True,
            "DisplayOrder": 10,
            "EstimatedMinutes": 25,
            "FinalStepCompletionMode": "AfterFinalEmbedAndQuizPass",
            "QuizPassingScore": 70,
        },
        {
            "Title": "Cybersecurity Awareness",
            "AssignmentKey": "cybersecurity-awareness",
            "AssignmentType": "Training",
            "Category": "IT",
            "Summary": "Practical training on password hygiene, phishing, and safe data handling in M365.",
            "Instructions": (
                "<p><strong>Goal:</strong> Reduce phishing and credential risk across the office.</p>"
                "<ul>"
                "<li>Review the examples and guidance.</li>"
                "<li>Finish the recap video on the final step to mark complete.</li>"
                "</ul>"
            ),
            "Active": True,
            "TargetMode@odata.type": "Collection(Edm.String)",
            "TargetMode": ["Roles"],
            "TargetRoles@odata.type": "Collection(Edm.String)",
            "TargetRoles": [
                "ATTORNEY",
                "CDD",
                "LOP",
                "TRIALSUPERVISOR",
                "HR",
                "COMPLIANCEOFFICER",
                "IT",
            ],
            "TargetRoles0@odata.type": "Collection(Edm.String)",
            "TargetRoles0": [
                "ATTORNEY",
                "CDD",
                "LOP",
                "TRIALSUPERVISOR",
                "HR",
                "COMPLIANCEOFFICER",
                "IT",
            ],
            "DueDaysAfterAssigned": 10,
            "CreateCalendarEvent": True,
            "SendAssignmentEmail": True,
            "DisplayOrder": 20,
            "EstimatedMinutes": 20,
            "FinalStepCompletionMode": "AfterFinalEmbed",
            "QuizPassingScore": 70,
        },
        {
            "Title": "New Hire Orientation",
            "AssignmentKey": "new-hire-orientation",
            "AssignmentType": "Training",
            "Category": "Onboarding",
            "Summary": "Orientation to office mission, intranet usage, and confidentiality expectations.",
            "Instructions": (
                "<p><strong>Goal:</strong> Help new staff get productive quickly and safely.</p>"
                "<ul>"
                "<li>Follow the steps in order.</li>"
                "<li>Finish the recap video on the final step to mark complete.</li>"
                "</ul>"
            ),
            "Active": True,
            "TargetMode@odata.type": "Collection(Edm.String)",
            "TargetMode": ["Roles"],
            "TargetRoles@odata.type": "Collection(Edm.String)",
            "TargetRoles": [
                "ATTORNEY",
                "CDD",
                "LOP",
                "TRIALSUPERVISOR",
                "HR",
                "COMPLIANCEOFFICER",
                "IT",
            ],
            "TargetRoles0@odata.type": "Collection(Edm.String)",
            "TargetRoles0": [
                "ATTORNEY",
                "CDD",
                "LOP",
                "TRIALSUPERVISOR",
                "HR",
                "COMPLIANCEOFFICER",
                "IT",
            ],
            "DueDaysAfterAssigned": 7,
            "CreateCalendarEvent": False,
            "SendAssignmentEmail": True,
            "DisplayOrder": 30,
            "EstimatedMinutes": 30,
            "FinalStepCompletionMode": "Manual",
            "QuizPassingScore": 70,
        },
        {
            "Title": "Remote Work Acknowledgment",
            "AssignmentKey": "remote-work-acknowledgment",
            "AssignmentType": "Acknowledgment",
            "Category": "Policy",
            "Summary": "Acknowledgment of remote work expectations, security requirements, and privacy safeguards.",
            "Instructions": (
                "<p><strong>Goal:</strong> Confirm understanding of remote work policy and security expectations.</p>"
                "<ul>"
                "<li>Read the policy summary.</li>"
                "<li>On the final step, review the short acknowledgment video to unlock completion.</li>"
                "</ul>"
            ),
            "Active": True,
            "TargetMode@odata.type": "Collection(Edm.String)",
            "TargetMode": ["Roles"],
            "TargetRoles@odata.type": "Collection(Edm.String)",
            "TargetRoles": [
                "ATTORNEY",
                "CDD",
                "LOP",
                "TRIALSUPERVISOR",
                "HR",
                "COMPLIANCEOFFICER",
                "IT",
            ],
            "TargetRoles0@odata.type": "Collection(Edm.String)",
            "TargetRoles0": [
                "ATTORNEY",
                "CDD",
                "LOP",
                "TRIALSUPERVISOR",
                "HR",
                "COMPLIANCEOFFICER",
                "IT",
            ],
            "DueDaysAfterAssigned": 5,
            "CreateCalendarEvent": False,
            "SendAssignmentEmail": True,
            "DisplayOrder": 40,
            "EstimatedMinutes": 10,
            "FinalStepCompletionMode": "AfterQuizPass",
            "QuizPassingScore": 70,
        },
    ]


def steps_seed_rows(final_video_url: str) -> dict[str, list[dict[str, Any]]]:
    # Use one final embed URL per assignment so the front-end completion gating can be exercised.
    # You can override FINAL_EMBED_URL via env var if you prefer a tenant-hosted video.
    return {
        "Sexual Harassment Prevention": [
            {
                "StepOrder": 1,
                "StepTitle": "Overview and legal expectations",
                "EstimatedMinutes": 6,
                "BodyHtml": (
                    "<p>This training covers prohibited conduct and office expectations.</p>"
                    "<ul>"
                    "<li>Harassment is conduct based on protected characteristics that creates a hostile environment.</li>"
                    "<li>Supervisors and staff have reporting obligations under office policy.</li>"
                    "</ul>"
                ),
                "AllowMarkCompleteHere": False,
            },
            {
                "StepOrder": 2,
                "StepTitle": "Recognizing prohibited conduct",
                "EstimatedMinutes": 6,
                "BodyHtml": (
                    "<p>Recognize patterns that require reporting and intervention.</p>"
                    "<ul>"
                    "<li>Unwanted comments, jokes, or repeated contact</li>"
                    "<li>Requests for favors, coercion, or threats</li>"
                    "<li>Retaliation concerns after a report</li>"
                    "</ul>"
                ),
                "AllowMarkCompleteHere": False,
            },
            {
                "StepOrder": 3,
                "StepTitle": "Reporting obligations and office policy",
                "EstimatedMinutes": 6,
                "BodyHtml": (
                    "<p>Use the office reporting channels. Timely reporting helps protect staff and clients.</p>"
                    "<ol>"
                    "<li>Document what happened and when.</li>"
                    "<li>Report to HR/Compliance or your supervisor per policy.</li>"
                    "<li>Preserve evidence (emails/messages) where applicable.</li>"
                    "</ol>"
                ),
                "AllowMarkCompleteHere": False,
            },
            {
                "StepOrder": 4,
                "StepTitle": "Final review video",
                "EstimatedMinutes": 7,
                "BodyHtml": (
                    "<p>Watch the recap video to unlock completion.</p>"
                    "<p><em>Completion gating is lightweight in dev.</em></p>"
                ),
                "EmbedUrl": final_video_url,
                "RequireEmbedCompletion": True,
                "AllowMarkCompleteHere": True,
            },
        ],
        "Cybersecurity Awareness": [
            {
                "StepOrder": 1,
                "StepTitle": "Password hygiene",
                "EstimatedMinutes": 5,
                "BodyHtml": (
                    "<ul>"
                    "<li>Use a password manager.</li>"
                    "<li>Enable MFA everywhere possible.</li>"
                    "<li>Never reuse passwords across systems.</li>"
                    "</ul>"
                ),
                "AllowMarkCompleteHere": False,
            },
            {
                "StepOrder": 2,
                "StepTitle": "Phishing and suspicious email",
                "EstimatedMinutes": 6,
                "BodyHtml": (
                    "<p>Red flags:</p>"
                    "<ul>"
                    "<li>Urgency, threats, or unusual payment requests</li>"
                    "<li>Unexpected attachments or links</li>"
                    "<li>Sender display name doesn’t match the email address</li>"
                    "</ul>"
                ),
                "AllowMarkCompleteHere": False,
            },
            {
                "StepOrder": 3,
                "StepTitle": "Device and data handling",
                "EstimatedMinutes": 4,
                "BodyHtml": (
                    "<ul>"
                    "<li>Lock your screen when away.</li>"
                    "<li>Avoid storing client data on unmanaged devices.</li>"
                    "<li>Use M365 sharing controls; avoid personal email.</li>"
                    "</ul>"
                ),
                "AllowMarkCompleteHere": False,
            },
            {
                "StepOrder": 4,
                "StepTitle": "Final recap video",
                "EstimatedMinutes": 5,
                "BodyHtml": "<p>Watch the recap video to unlock completion.</p>",
                "EmbedUrl": final_video_url,
                "RequireEmbedCompletion": True,
                "AllowMarkCompleteHere": True,
            },
        ],
        "New Hire Orientation": [
            {
                "StepOrder": 1,
                "StepTitle": "Welcome and office mission",
                "EstimatedMinutes": 8,
                "BodyHtml": (
                    "<p>Welcome to the office.</p>"
                    "<ul>"
                    "<li>Our mission is client-centered defense.</li>"
                    "<li>We protect confidentiality and dignity in every interaction.</li>"
                    "</ul>"
                ),
                "AllowMarkCompleteHere": False,
            },
            {
                "StepOrder": 2,
                "StepTitle": "Intranet and internal tools",
                "EstimatedMinutes": 8,
                "BodyHtml": (
                    "<p>Use the intranet for announcements, policies, and training assignments.</p>"
                    "<ul>"
                    "<li>Find procedures and checklists in the LOP area.</li>"
                    "<li>Use the assignments page to track required trainings.</li>"
                    "</ul>"
                ),
                "AllowMarkCompleteHere": False,
            },
            {
                "StepOrder": 3,
                "StepTitle": "Case/confidentiality expectations",
                "EstimatedMinutes": 8,
                "BodyHtml": (
                    "<p>Client information is sensitive.</p>"
                    "<ul>"
                    "<li>Only share with authorized staff.</li>"
                    "<li>Use approved M365 tools for sharing and storage.</li>"
                    "</ul>"
                ),
                "AllowMarkCompleteHere": False,
            },
            {
                "StepOrder": 4,
                "StepTitle": "Final orientation recap",
                "EstimatedMinutes": 6,
                "BodyHtml": "<p>Watch the recap video to unlock completion.</p>",
                "EmbedUrl": final_video_url,
                "RequireEmbedCompletion": True,
                "AllowMarkCompleteHere": True,
            },
        ],
        "Remote Work Acknowledgment": [
            {
                "StepOrder": 1,
                "StepTitle": "Policy summary",
                "EstimatedMinutes": 4,
                "BodyHtml": (
                    "<ul>"
                    "<li>Remote work must maintain professionalism and confidentiality.</li>"
                    "<li>Use approved devices and secure networks.</li>"
                    "</ul>"
                ),
                "AllowMarkCompleteHere": False,
            },
            {
                "StepOrder": 2,
                "StepTitle": "Security and privacy expectations",
                "EstimatedMinutes": 3,
                "BodyHtml": (
                    "<ul>"
                    "<li>Do not print sensitive material at home unless authorized.</li>"
                    "<li>Ensure conversations cannot be overheard.</li>"
                    "<li>Report lost devices immediately.</li>"
                    "</ul>"
                ),
                "AllowMarkCompleteHere": False,
            },
            {
                "StepOrder": 3,
                "StepTitle": "Final acknowledgment",
                "EstimatedMinutes": 3,
                "BodyHtml": (
                    "<p>Watch the short acknowledgment video and then mark complete.</p>"
                ),
                "EmbedUrl": final_video_url,
                "RequireEmbedCompletion": True,
                "AllowMarkCompleteHere": True,
            },
        ],
    }


def main() -> None:
    authenticate()
    hub_name = env_required("HUB_NAME")
    site_id = get_site_id(hub_name)

    catalog_title, catalog_list_id = ensure_list(site_id, "LIST_ASSIGNMENTCATALOG", "AssignmentCatalog")
    steps_title, steps_list_id = ensure_list(site_id, "LIST_ASSIGNMENTSTEPS", "AssignmentSteps")
    assignments_title, assignments_list_id = ensure_list(site_id, "LIST_ASSIGNMENTS", "Assignments")
    quiz_q_title, quiz_q_list_id = ensure_list(site_id, "LIST_ASSIGNMENTQUIZQUESTIONS", "AssignmentQuizQuestions")
    quiz_a_title, quiz_a_list_id = ensure_list(site_id, "LIST_ASSIGNMENTQUIZATTEMPTS", "AssignmentQuizAttempts")

    status_col = os.getenv("INTERNALCOLUMN_ASSIGNMENTSTATUS") or "Status"

    print(f"Using site_id={site_id}")
    print(f"Catalog list: {catalog_title} ({catalog_list_id})")
    print(f"Steps list: {steps_title} ({steps_list_id})")
    print(f"Assignments list: {assignments_title} ({assignments_list_id}) status_col={status_col}")
    print(f"Quiz questions list: {quiz_q_title} ({quiz_q_list_id})")
    print(f"Quiz attempts list: {quiz_a_title} ({quiz_a_list_id})")

    # Optional: allow you to swap in a tenant-hosted MP4 later.
    # Must be a direct .mp4 or YouTube URL for front-end gating to work.
    final_embed_url = os.getenv("FINAL_EMBED_URL") or "https://www.youtube.com/watch?v=AW8KI6gYnDI"

    # 1) Catalog upsert
    catalog_ids_by_title: dict[str, int] = {}
    for row in catalog_seed_rows():
        title = row["Title"]
        # Create minimal item first (Graph create can be finicky with checkbox-choice fields).
        res = upsert_list_item(
            site_id,
            catalog_list_id,
            unique_filter=f"fields/Title eq '{odata_escape(title)}'",
            field_data={"Title": title},
            fields_select=["Title"],
        )
        item_id = int(res["id"]) if res.get("id") else None
        if not item_id:
            # Shouldn't happen, but keep going
            raise Exception(f"Failed to resolve catalog item id for {title}")
        # Then patch fields. In this tenant, some checkbox-choice fields must be patched separately.
        simple_patch = dict(row)
        # remove the collection annotations/values for the second patch
        for k in [
            "TargetMode@odata.type",
            "TargetMode",
            "TargetRoles@odata.type",
            "TargetRoles",
            "TargetRoles0@odata.type",
            "TargetRoles0",
        ]:
            simple_patch.pop(k, None)
        update_list_item(site_id, catalog_list_id, item_id, simple_patch)

        choice_patch = {
            "TargetMode@odata.type": row.get("TargetMode@odata.type"),
            "TargetMode": row.get("TargetMode"),
            "TargetRoles@odata.type": row.get("TargetRoles@odata.type"),
            "TargetRoles": row.get("TargetRoles"),
            "TargetRoles0@odata.type": row.get("TargetRoles0@odata.type"),
            "TargetRoles0": row.get("TargetRoles0"),
        }
        update_list_item(site_id, catalog_list_id, item_id, choice_patch)
        catalog_ids_by_title[title] = item_id
        print(f"[Catalog] {res['mode']}+patch: {title} -> {item_id}")

    # 2) Steps upsert
    lookup_field = lookup_id_field("AssignmentCatalogId")
    for catalog_title_name, steps in steps_seed_rows(final_embed_url).items():
        catalog_item_id = catalog_ids_by_title[catalog_title_name]
        for step in steps:
            step_order = step["StepOrder"]
            fields = {
                **step,
                lookup_field: catalog_item_id,
            }
            res = upsert_list_item(
                site_id,
                steps_list_id,
                unique_filter=f"fields/{lookup_field} eq {catalog_item_id} and fields/StepOrder eq {step_order}",
                field_data=fields,
                fields_select=["StepOrder"],
            )
            print(f"[Step] {res['mode']}: {catalog_title_name} step {step_order}")

    # 3) Assignments rows (per-user)
    now = datetime.now(timezone.utc)

    # Prefer seeding for real users that exist in the site user-info list.
    current_user_email = os.getenv("DEV_CURRENT_USER_EMAIL") or "sgonzales@csproject25.onmicrosoft.com"
    demo_users = [current_user_email]
    extra = (os.getenv("DEV_DEMO_EMAILS") or "").strip()
    if extra:
        demo_users.extend([e.strip() for e in extra.split(";") if e.strip()])

    # Seed rows designed to exercise: not started, in progress mid-step, completed, overdue, and final-step gating.
    seed_assignments = [
        # One user with multiple assignments and varied statuses (enough to exercise UI)
        {
            "email": demo_users[0],
            "catalog": "Sexual Harassment Prevention",
            "status": "In Progress",
            "currentStep": 2,
            "percent": 50,
            "due": now + timedelta(days=7),
            "reason": "Office-wide annual compliance training (dev seed).",
        },
        {
            "email": demo_users[0],
            "catalog": "Cybersecurity Awareness",
            "status": "Overdue",
            "currentStep": 1,
            "percent": 25,
            "due": now - timedelta(days=5),
            "reason": "Past-due security training (dev seed).",
        },
        {
            "email": demo_users[0],
            "catalog": "Remote Work Acknowledgment",
            "status": "Completed",
            "FinalEmbedCompleted": True,
            "currentStep": 3,
            "percent": 100,
            "due": now - timedelta(days=1),
            "completed": now - timedelta(days=2),
            "reason": "Policy acknowledgment (dev seed).",
        },
        # Final-step gating candidate (open and watch)
        {
            "email": demo_users[0],
            "catalog": "New Hire Orientation",
            "status": "In Progress",
            "currentStep": 4,
            "percent": 90,
            "due": now + timedelta(days=1),
            "reason": "Orientation recap flow (dev seed).",
        },
    ]

    assign_lookup = lookup_id_field("AssignmentCatalogId")
    for a in seed_assignments:
        cat_title = a["catalog"]
        cat_id = catalog_ids_by_title[cat_title]
        email = a["email"]
        try:
            employee_lookup_id = get_sharepoint_user_lookup_id(site_id, email)
        except Exception as e:
            print(f"[Assignment] skip: could not resolve Employee person for {email}: {e}")
            continue
        title = f"{cat_title} - {email}"

        fields: dict[str, Any] = {
            "Title": title,
            assign_lookup: cat_id,
            "EmployeeLookupId": employee_lookup_id,
            "EmployeeEmail": email,
            "Reason": a["reason"],
            "AssignedDate": iso(now - timedelta(days=1)),
            "DueDate": iso(a["due"]),
            status_col: a["status"],
            "CurrentStepOrder": a["currentStep"],
            # SharePoint "Number" columns shown as % are typically stored as a 0..1 fraction in Graph.
            "PercentComplete": float(a["percent"]) / 100.0,
            "LastOpenedOn": iso(now),
            "FinalEmbedCompleted": a["finalEmbedCompleted"] or False
        }
        if a.get("completed"):
            fields["CompletedOn"] = iso(a["completed"])

        res = upsert_list_item(
            site_id,
            assignments_list_id,
            unique_filter=f"fields/EmployeeEmail eq '{odata_escape(email)}' and fields/{assign_lookup} eq {cat_id}",
            field_data=fields,
            fields_select=["EmployeeEmail"],
        )
        print(f"[Assignment] {res['mode']}: {email} -> {cat_title} ({a['status']})")

    # 4) Quiz questions (seed a few for Sexual Harassment Prevention)
    quiz_lookup = lookup_id_field("AssignmentCatalogId")
    shp_id = catalog_ids_by_title.get("Sexual Harassment Prevention")
    if shp_id:
        questions = [
            {
                "QuestionOrder": 1,
                "QuestionText": "What is the best first step if you witness conduct that may violate harassment policy?",
                "QuestionType": "MultipleChoice",
                "ChoicesText": "A. Report concerns immediately\nB. Ignore conduct if no one complains\nC. Share confidential details with coworkers",
                "CorrectAnswer": "A",
                "Explanation": "Timely reporting helps protect staff and clients, and supports consistent enforcement.",
                "Active": True,
            },
            {
                "QuestionOrder": 2,
                "QuestionText": "Name one office-approved channel for reporting concerns (open answer).",
                "QuestionType": "OpenAnswer",
                "ChoicesText": "",
                "CorrectAnswer": "",
                "Explanation": "",
                "Active": True,
            },
        ]
        for q in questions:
            fields = {**q, quiz_lookup: shp_id, "Title": f"Sexual Harassment Q{q['QuestionOrder']}"}
            resq = upsert_list_item(
                site_id,
                quiz_q_list_id,
                unique_filter=f"fields/{quiz_lookup} eq {shp_id} and fields/QuestionOrder eq {q['QuestionOrder']}",
                field_data=fields,
                fields_select=["QuestionOrder"],
            )
            print(f"[QuizQ] {resq['mode']}: Sexual Harassment Q{q['QuestionOrder']}")

    print("Done.")


if __name__ == "__main__":
    main()

