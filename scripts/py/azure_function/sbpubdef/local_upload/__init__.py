import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
import requests
import msal
import time

SHAREPOINT_LIST_COLUMNS = ["LinkTitle", "_ColorTag", "ComplianceAssetId", "ID", "ContentType", "Modified", "Created", "Author", "Editor", "_UIVersionString", "Attachments", "Edit", "LinkTitleNoMenu", "DocIcon", "ItemChildCount", "FolderChildCount", "_ComplianceFlags", "_ComplianceTag", "_ComplianceTagWrittenTime", "_ComplianceTagUserId", "_IsRecord", "AppAuthor", "AppEditor"]
if (os.getenv('AZURE_FUNCTIONS_ENVIRONMENT') == None) or (os.getenv('AZURE_FUNCTIONS_ENVIRONMENT') == "Development"): # not in azure functions environment (module call/func start) -> use .env files
    [load_dotenv(Path(__file__).resolve().parents[5] / f"config/{env}") for env in ["env.public", ".env.public.dev", ".env.dev"]]
session_headers = {}
sharepoint_session_headers = {}

"""
utils
"""
def odata_escape(s: str) -> str: # OData (REST) is single quote only (and escapes with '' (instead of \'))
    return (s or "").replace("'", "''")

def authenticate():
    global session_headers
    global sharepoint_session_headers
    print("authenticating...")
    TENANT_ID = os.getenv("AZURE_TENANT_ID")
    CLIENT_ID = os.getenv("AZURE_CLIENT_ID")
    CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET")
    AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
    GRAPH_SCOPE = ["https://graph.microsoft.com/.default"]
    app = msal.ConfidentialClientApplication(CLIENT_ID, authority=AUTHORITY, client_credential=CLIENT_SECRET)
    result = app.acquire_token_for_client(scopes=GRAPH_SCOPE)
    if "access_token" not in result: raise Exception(result)
    session_headers = {"Authorization": f"Bearer {result['access_token']}"}

    # SharePoint REST token (needed for ensureuser / siteuser lookup ids)
    tenant = os.getenv("TENANT_NAME")
    if tenant:
        sp_scope = [f"https://{tenant}.sharepoint.com/.default"]
        sp_result = app.acquire_token_for_client(scopes=sp_scope)
        if "access_token" in sp_result:
            sharepoint_session_headers = {"Authorization": f"Bearer {sp_result['access_token']}"}

def get_site_id(site_name):
    TENANT_NAME = os.getenv("TENANT_NAME")
    site_resp = requests.get(f"https://graph.microsoft.com/v1.0/sites/{TENANT_NAME}.sharepoint.com:/sites/{site_name}", headers=session_headers)
    site = site_resp.json()
    site_id = site["id"]
    return site_id

# drives
def get_site_drives(site_id):
    drives_resp = requests.get(f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives", headers=session_headers)
    return drives_resp.json()["value"]

def get_drive_id(site_id, doc_lib_name):
    for drive in get_site_drives(site_id):
        if drive["name"] == doc_lib_name: return drive["id"]
    return ""

# email
""" App-only Graph sendMail: POST https://graph.microsoft.com/v1.0/users/{sender_upn}/sendMail sender_upn should be a licensed mailbox (often a service account). """
def send_email(to_email: str | list, subject: str, body: str, *, sender_upn: str | None = None, from_email: str | None = None, content_type: str = "Text"):
    if isinstance(to_email, str): to_email = [to_email]
    sender_upn = sender_upn or os.getenv("SENDER_UPN") # pick sender from param or env var
    if not sender_upn: return {"success": False, "err": "Missing sender_upn (pass sender_upn or set SENDER_UPN env var)."}
    email_data = {
        "message": {
            "subject": subject,
            "body": {"contentType": content_type, "content": body},
            "toRecipients": [{"emailAddress": {"address": email}} for email in to_email],
        }
    }
    if from_email: email_data["message"]["from"] = {"emailAddress": {"address": from_email}} # Optional. In many orgs, Graph ignores/blocks custom 'from' unless SendAs/SendOnBehalf is configured.
    url = f"https://graph.microsoft.com/v1.0/users/{sender_upn}/sendMail"
    resp = requests.post(url, headers={**session_headers, "Content-Type": "application/json"}, json=email_data)
    if resp.status_code == 202: return {"success": True, "err": ""}
    return { "success": False, "err": f"Failed to send email via {url}: {resp.status_code} - {resp.text}" }

"""
CRUD: Create
"""
# Upload Files to Document Library
def upload_file(site_id, drive_id, file_path, subfolder):
    file_name = os.path.basename(file_path)
    with open(file_path, "rb") as f:
        upload_resp = requests.put(f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives/{drive_id}/root:/{subfolder + "/" if subfolder else "" }{file_name}:/content", headers=session_headers, data=f)
        upload_data = upload_resp.json()
        return upload_data.get("webUrl") # sharepoint url

# Create SharePoint List Item
def add_list_item(site_id, list_id, field_data: dict):
    url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id}/items"
    headers = {**session_headers, "Content-Type": "application/json"}
    payload = {"fields": field_data}

    # Graph can intermittently 503/429; retry with backoff.
    for attempt in range(6):
        resp = requests.post(url, headers=headers, json=payload)
        if resp.status_code < 300:
            return resp.json()
        if resp.status_code in (429, 500, 502, 503, 504):
            delay = min(8.0, 0.5 * (2 ** attempt))
            time.sleep(delay)
            continue
        return resp.json()
    return resp.json()

"""
CRUD: Read
"""
# lists
def get_site_lists(site_id, *, include_hidden: bool = True):
    url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists"
    params = {}
    # Including `system` in $select returns hidden/system lists too (needed for User Information List).
    if include_hidden:
        params["$select"] = "id,name,system"
    resp = requests.get(url, headers=session_headers, params=params)
    if resp.status_code >= 300:
        raise Exception(f"Graph get_site_lists failed: {resp.status_code} {resp.text}")
    return resp.json()["value"]

def get_list_id(site_id, list_name):
    for lst in get_site_lists(site_id, include_hidden=True):
        if lst["name"] == list_name: return lst["id"]
    return ""

def get_list_columns(site_id, list_id):
    resp = requests.get(f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id}/columns", headers=session_headers)
    return resp.json().get('value', [])

def get_list_column_names(site_id, list_id, include_sp_cols=False):
    cols = []
    for col in get_list_columns(site_id, list_id):
        if include_sp_cols or not(col['name'] in SHAREPOINT_LIST_COLUMNS):
            cols.append(col['name'])
    return cols

def get_list_items(site_id: str, list_id: str, *, fields_filter: str = "", top: int = 50, fields_select: list[str] | None = None):
    """
    fields_filter examples: "fields/Filename eq 'abc'"   "startswith(fields/Filename,'2024-')"    (List Settings -> Indexed Columns)
    fields_select example: ["Filename","Title","Category"]
    """
    url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id}/items"
    if fields_select and len(fields_select): expand = "fields($select=" + ",".join(fields_select) + ")" # IMPORTANT: use fields($select=...) not just fields
    else: expand = "fields"  # ok, but less predictable for filtering
    params = {
        "$expand": expand,
        "$top": str(top),
    }
    if fields_filter: params["$filter"] = fields_filter
    headers = {**session_headers}
    # Dev-friendly: allow non-indexed field filters (Graph otherwise 400s).
    if fields_filter:
        headers["Prefer"] = "HonorNonIndexedQueriesWarningMayFailRandomly"
    resp = requests.get(url, headers=headers, params=params)
    if resp.status_code >= 300: raise Exception(f"Graph get_list_items failed: {resp.status_code} {resp.text}")
    return resp.json().get("value", [])

def upsert_list_item(site_id: str, list_id: str, *, unique_filter: str, field_data: dict, fields_select: list[str] | None = None):
    """
    Upsert by querying list items with a Graph fields filter.

    unique_filter examples:
      - "fields/Title eq 'Some Title'"
      - "fields/EmployeeEmail eq 'a@b.com' and fields/AssignmentCatalogIdLookupId eq 12"
    """
    rows = get_list_items(site_id, list_id, fields_filter=unique_filter, top=1, fields_select=fields_select)
    if rows and len(rows) > 0:
        item_id = rows[0].get("id")
        update_list_item(site_id, list_id, item_id, field_data)
        return {"mode": "update", "id": item_id, "existing": rows[0]}
    created = add_list_item(site_id, list_id, field_data)
    if isinstance(created, dict) and created.get("error"):
        raise Exception(f"Graph add_list_item failed: {created}")
    created_id = created.get("id")
    if created_id:
        return {"mode": "create", "id": created_id, "created": created}
    # Some Graph responses don't include listItem.id reliably; re-query by the unique filter.
    rows2 = get_list_items(site_id, list_id, fields_filter=unique_filter, top=1, fields_select=fields_select)
    if rows2 and len(rows2) > 0:
        return {"mode": "create", "id": rows2[0].get("id"), "created": created, "refetched": rows2[0]}
    return {"mode": "create", "id": None, "created": created}

def lookup_id_field(lookup_col_name: str) -> str:
    # SharePoint lookup columns in Graph fields commonly expose "<ColName>LookupId"
    return f"{lookup_col_name}LookupId"

"""
CRUD: Update
"""
def update_list_item(site_id: str, list_id: str, item_id: str | int, field_data: dict):
    url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id}/items/{item_id}/fields"
    headers = {**session_headers, "Content-Type": "application/json"}

    # Graph can intermittently 503/429; retry with backoff.
    last = None
    for attempt in range(6):
        resp = requests.patch(url, headers=headers, json=field_data)
        last = resp
        if resp.status_code < 300:
            return True
        if resp.status_code in (429, 500, 502, 503, 504):
            delay = min(8.0, 0.5 * (2 ** attempt))
            time.sleep(delay)
            continue
        break
    raise Exception(f"Graph update_list_item failed: {last.status_code if last else 'n/a'} {last.text if last else ''}")


def get_list_item(site_id: str, list_id: str, item_id: str | int, *, fields_select: list[str]) -> dict:
    """
    Fetch a single list item with selected fields (Microsoft Graph list items API).
    Returns the JSON object including top-level `id` and `fields`.
    """
    if not session_headers.get("Authorization"):
        raise Exception("Graph session_headers missing Authorization (call authenticate() first).")
    sel = ",".join(fields_select)
    url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id}/items/{item_id}"
    params = {"$expand": f"fields($select={sel})"}
    resp = requests.get(url, headers=session_headers, params=params)
    if resp.status_code >= 300:
        raise Exception(f"Graph get_list_item failed: {resp.status_code} {resp.text}")
    return resp.json()


def graph_get_user_object_id(email: str) -> str:
    """
    Minimal Entra object id lookup via Microsoft Graph.

    Requires appropriate Microsoft Graph application permissions (commonly User.Read.All).
    """
    if not session_headers.get("Authorization"):
        raise Exception("Graph session_headers missing Authorization (call authenticate() first).")

    safe = requests.utils.quote(email, safe="")
    url = f"https://graph.microsoft.com/v1.0/users/{safe}?$select=id"
    resp = requests.get(url, headers=session_headers)
    if resp.status_code >= 300:
        raise Exception(f"Graph user lookup failed for {email}: {resp.status_code} {resp.text}")
    data = resp.json()
    oid = data.get("id")
    if not oid:
        raise Exception(f"Graph user lookup missing id for {email}: {data}")
    return str(oid)


"""
SharePoint REST helpers (minimal, dev-focused)
"""

def _sp_site_url(site_name: str) -> str:
    tenant = os.getenv("TENANT_NAME")
    if not tenant:
        raise Exception("Missing TENANT_NAME env var for SharePoint REST calls.")
    return f"https://{tenant}.sharepoint.com/sites/{site_name}"

def ensure_user(site_name: str, email: str) -> int:
    """
    Resolve a SharePoint user and return the numeric user Id used by Person fields as <FieldName>LookupId.

    Uses SharePoint REST: POST .../_api/web/ensureuser
    """
    if not sharepoint_session_headers:
        raise Exception("Missing sharepoint_session_headers (SharePoint token). Check app permissions and TENANT_NAME.")
    site_url = _sp_site_url(site_name)
    url = f"{site_url}/_api/web/ensureuser"
    # Common claims format for SPO. Using email directly also works in many tenants, but claims is safest.
    login = f"i:0#.f|membership|{email}"
    resp = requests.post(
        url,
        headers={
            **sharepoint_session_headers,
            "Accept": "application/json;odata=nometadata",
            "Content-Type": "application/json;odata=nometadata",
        },
        json={"logonName": login},
    )
    if resp.status_code >= 300:
        raise Exception(f"SharePoint ensureuser failed: {resp.status_code} {resp.text}")
    data = resp.json()
    user_id = data.get("Id") or data.get("id")
    if not user_id:
        raise Exception(f"SharePoint ensureuser missing Id: {data}")
    return int(user_id)

def get_sharepoint_user_lookup_id(site_id: str, email: str) -> int:
    """
    Resolve SharePoint person/lookup id for a user by querying the built-in 'User Information List'.

    This works with Graph app-only tokens and avoids SharePoint REST (which may reject app-only tokens).
    The returned value can be used for Person fields as: <FieldName>LookupId
    """
    # Common internal list names for the SharePoint user info list (often hidden)
    user_list_candidates = ["User Information List", "users", "SiteUserInfoList"]
    user_list_id = ""
    used_name = ""
    for name in user_list_candidates:
        lid = get_list_id(site_id, name)
        if lid:
            user_list_id = lid
            used_name = name
            break
    if not user_list_id:
        raise Exception(f"Could not find a user info list on site_id={site_id}. Tried: {user_list_candidates}")
    rows = get_list_items(
        site_id,
        user_list_id,
        fields_filter=f"fields/EMail eq '{odata_escape(email)}'",
        top=1,
        fields_select=["EMail"],
    )
    if not rows:
        raise Exception(f"User not found in '{used_name}' for email={email}")
    # Graph list item 'id' is the SharePoint list item id, which matches the user lookup id in SharePoint.
    return int(rows[0].get("id"))

"""
CRUD: Delete
"""
