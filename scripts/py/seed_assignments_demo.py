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
            "TargetMode": "Roles",
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
            "FinalStepCompletionMode": "MarkCompleteAfterEmbedFinish",
        },
        {
            "Title": "Cybersecurity Awareness",
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
            "TargetMode": "Roles",
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
            "FinalStepCompletionMode": "MarkCompleteAfterEmbedFinish",
        },
        {
            "Title": "New Hire Orientation",
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
            "TargetMode": "Roles",
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
            "FinalStepCompletionMode": "MarkCompleteAfterEmbedFinish",
        },
        {
            "Title": "Remote Work Acknowledgment",
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
            "TargetMode": "Roles",
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
            "FinalStepCompletionMode": "MarkCompleteAfterEmbedFinish",
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
    site_id = get_site_id(env_required("HUB_NAME"))

    catalog_title, catalog_list_id = ensure_list(site_id, "LIST_ASSIGNMENTCATALOG", "AssignmentCatalog")
    steps_title, steps_list_id = ensure_list(site_id, "LIST_ASSIGNMENTSTEPS", "AssignmentSteps")
    assignments_title, assignments_list_id = ensure_list(site_id, "LIST_ASSIGNMENTS", "Assignments")

    status_col = os.getenv("INTERNALCOLUMN_ASSIGNMENTSTATUS") or "Status"

    print(f"Using site_id={site_id}")
    print(f"Catalog list: {catalog_title} ({catalog_list_id})")
    print(f"Steps list: {steps_title} ({steps_list_id})")
    print(f"Assignments list: {assignments_title} ({assignments_list_id}) status_col={status_col}")

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
        # Then patch full fields (this path supports checkbox-choice updates).
        update_list_item(site_id, catalog_list_id, item_id, row)
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

    tenant_domain = os.getenv("TENANT_NAME") or "csproject25"
    # Use stable dev/demo emails in the tenant domain. Include the current dev user if provided.
    current_user_email = os.getenv("DEV_CURRENT_USER_EMAIL") or "sgonzales@csproject25.onmicrosoft.com"
    demo_users = [
        current_user_email,
        f"dev.attorney1@{tenant_domain}.onmicrosoft.com",
        f"dev.staff1@{tenant_domain}.onmicrosoft.com",
        f"dev.supervisor1@{tenant_domain}.onmicrosoft.com",
    ]

    # Seed rows designed to exercise: not started, in progress mid-step, completed, overdue, and final-step gating.
    seed_assignments = [
        # Current user: multiple assignments
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
            "status": "Not Started",
            "currentStep": 0,
            "percent": 0,
            "due": now + timedelta(days=3),
            "reason": "Office-wide security training (dev seed).",
        },
        # Completed assignment
        {
            "email": demo_users[1],
            "catalog": "Remote Work Acknowledgment",
            "status": "Completed",
            "currentStep": 3,
            "percent": 100,
            "due": now - timedelta(days=1),
            "completed": now - timedelta(days=2),
            "reason": "Policy acknowledgment (dev seed).",
        },
        # Overdue assignment
        {
            "email": demo_users[2],
            "catalog": "Cybersecurity Awareness",
            "status": "Overdue",
            "currentStep": 1,
            "percent": 25,
            "due": now - timedelta(days=5),
            "reason": "Past-due security training (dev seed).",
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
        title = f"{cat_title} - {email}"

        fields: dict[str, Any] = {
            "Title": title,
            assign_lookup: cat_id,
            "EmployeeEmail": email,
            "Reason": a["reason"],
            "AssignedDate": iso(now - timedelta(days=1)),
            "DueDate": iso(a["due"]),
            status_col: a["status"],
            "CurrentStepOrder": a["currentStep"],
            "PercentComplete": a["percent"],
            "LastOpenedOn": iso(now),
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

    print("Done.")


if __name__ == "__main__":
    main()

