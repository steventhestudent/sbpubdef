import os
from pathlib import Path
from dotenv import load_dotenv
import requests
import msal

SHAREPOINT_LIST_COLUMNS = ["LinkTitle", "_ColorTag", "ComplianceAssetId", "ID", "ContentType", "Modified", "Created", "Author", "Editor", "_UIVersionString", "Attachments", "Edit", "LinkTitleNoMenu", "DocIcon", "ItemChildCount", "FolderChildCount", "_ComplianceFlags", "_ComplianceTag", "_ComplianceTagWrittenTime", "_ComplianceTagUserId", "_IsRecord", "AppAuthor", "AppEditor"]
if (os.getenv('AZURE_FUNCTIONS_ENVIRONMENT') == None) or (os.getenv('AZURE_FUNCTIONS_ENVIRONMENT') == "Development"): # not in azure functions environment (module call/func start) -> use .env files
    [load_dotenv(Path(__file__).resolve().parents[5] / f"config/{env}") for env in [".env.public.dev", ".env.dev"]]
session_headers = {}

"""
utils
"""
def authenticate():
    global session_headers
    print("authenticating...")
    TENANT_ID = os.getenv("AZURE_TENANT_ID")
    CLIENT_ID = os.getenv("AZURE_CLIENT_ID")
    CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET")
    AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
    SCOPE = ["https://graph.microsoft.com/.default"]
    app = msal.ConfidentialClientApplication(CLIENT_ID, authority=AUTHORITY, client_credential=CLIENT_SECRET)
    result = app.acquire_token_for_client(scopes=SCOPE)
    if "access_token" not in result: raise Exception(result)
    session_headers = {"Authorization": f"Bearer {result['access_token']}"}

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

# lists
def get_site_lists(site_id):
    resp = requests.get(f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists", headers=session_headers)
    return resp.json()["value"]

def get_list_id(site_id, list_name):
    for lst in get_site_lists(site_id):
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
    resp = requests.post(
        f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{list_id}/items",
        headers={**session_headers, "Content-Type": "application/json"},
        json={"fields": field_data}
    )
    return resp.json().get("webUrl")

"""
CRUD: Read
"""

"""
CRUD: Update
"""

"""
CRUD: Delete
"""
