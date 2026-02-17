import os.path
from enum import Enum

from . import ProcedureChecklist
from ...local_upload import authenticate, get_site_id, get_drive_id, get_list_id, upload_file as _upload_file, add_list_item as _add_list_item

class UPDATE_MODES(Enum):
    NO_API_REQUESTS = 0
    JSON_ONLY = 1
    ALL = 2

# config
UPDATE_MODE = UPDATE_MODES.NO_API_REQUESTS

if not(UPDATE_MODE == UPDATE_MODES.NO_API_REQUESTS):
    authenticate()
    site_id = get_site_id("PD-Intranet")
    drive_id = get_drive_id(site_id, "user_uploads")
    list_id = get_list_id(site_id, "LOPProcedureChecklist")

def upload_file(file_path):
    if UPDATE_MODE == UPDATE_MODES.NO_API_REQUESTS or (UPDATE_MODE == UPDATE_MODES.JSON_ONLY and not(file_path.endswith('.json'))): return "https://csproject25.sharepoint.com/sites/PD-Intranet/user_uploads/resource/LOP/ProcedureChecklist/" + os.path.basename(file_path)
    return _upload_file(site_id, drive_id, file_path, "resource/LOP/ProcedureChecklist")

def add_list_item(procedure: ProcedureChecklist): # must use internal column names found w/ get_list_columns()
    if UPDATE_MODE.value < UPDATE_MODES.ALL.value: return "https://csproject25.sharepoint.com/sites/PD-Intranet/lists/LOPProcedureChecklist/0_.000" # we don't use this so it's ok to always use 0_.000
    return _add_list_item(site_id, list_id, { # sharepoint list columns
        "Category": procedure.category,
        "Title": procedure.title[0] if isinstance(procedure.title, list) else procedure.title, # just in case our title handling is buggy
        "DocumentURL": procedure.document_URL,
        "Filename": procedure.filename,
        "EffectiveDate": procedure.effective_date,
        "PageCount": len(procedure.pages),
        "json": procedure.json_URL
    })