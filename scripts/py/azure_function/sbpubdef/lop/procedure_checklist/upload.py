import os.path
from enum import Enum

from . import ProcedureChecklist
from ...local_upload import authenticate, get_site_id, get_drive_id, get_list_id, upload_file as _upload_file, add_list_item as _add_list_item, get_list_items, update_list_item as _update_list_item, odata_escape

class UPDATE_MODES(Enum):
    NO_API_REQUESTS = 0
    JSON_ONLY = 1
    ALL = 2

# config
UPDATE_MODE = UPDATE_MODES.ALL

if not(UPDATE_MODE == UPDATE_MODES.NO_API_REQUESTS):
    authenticate()
    site_id = get_site_id(os.getenv("HUB_NAME"))
    drive_id = get_drive_id(site_id, "user_uploads")
    procedures_list_id = get_list_id(site_id, os.getenv("LIST_PROCEDURECHECKLIST"))
    steps_list_id = get_list_id(site_id, os.getenv("LIST_PROCEDURESTEPS"))

def upload_file(file_path, skip=True): # todo: remove skip=True, add UPDATE_MODES to accomodate skipping all file uploads / IMAGE_ONLY / NO_IMAGE / PDF_ONLY
    if skip or UPDATE_MODE == UPDATE_MODES.NO_API_REQUESTS or (UPDATE_MODE == UPDATE_MODES.JSON_ONLY and not(file_path.endswith('.json'))): return "https://csproject25.sharepoint.com/sites/PD-Intranet/user_uploads/resource/LOP/ProcedureChecklist/" + os.path.basename(file_path)
    return _upload_file(site_id, drive_id, file_path, "resource/LOP/ProcedureChecklist")

def add_list_item(procedure: ProcedureChecklist): # must use internal column names found w/ get_list_columns()
    print("added listing")
    if UPDATE_MODE.value < UPDATE_MODES.ALL.value: return "https://csproject25.sharepoint.com/sites/PD-Intranet/lists/LOPProcedureChecklist/0_.000" # we don't use this so it's ok to always use 0_.000
    return _add_list_item(site_id, procedures_list_id, {
        "Title": procedure.title[0] if isinstance(procedure.title, list) else procedure.title, # just in case our title handling is buggy
        "Purpose": procedure.purpose,
        "Category": procedure.category,
        "DocumentURL": procedure.document_URL,
        "Filename": procedure.filename,
        "EffectiveDate": procedure.effective_date,
        "PageCount": len(procedure.pages),
        "json": procedure.json_URL
    })

def update_list_item(procedure: ProcedureChecklist, procedure_id): # must use internal column names found w/ get_list_columns()
    print("updated listing")
    if UPDATE_MODE.value < UPDATE_MODES.ALL.value: return True
    return _update_list_item(site_id, procedures_list_id, procedure_id, {
        "Title": procedure.title[0] if isinstance(procedure.title, list) else procedure.title, # just in case our title handling is buggy
        "Purpose": procedure.purpose,
        "Category": procedure.category,
        "DocumentURL": procedure.document_URL,
        "Filename": procedure.filename,
        "EffectiveDate": procedure.effective_date,
        "PageCount": len(procedure.pages),
        "json": procedure.json_URL
    })

def add_or_update_lists(procedure: ProcedureChecklist):
    rows = get_list_items(site_id, procedures_list_id, fields_filter=f"fields/Filename eq '{odata_escape(procedure.filename)}'")
    procedure_id = rows[0].get("id") if rows[0] else -1
    if (len(rows)) == 0:
        procedure_id = add_list_item(procedure).get('id')
    else: update_list_item(procedure, procedure_id)

    # add / update ProcedureSteps
    existing_steps_rows = get_list_items(site_id, steps_list_id, fields_filter=f"fields/ProcedureIdLookupId eq {procedure_id}", top=999)
    existing_steps_map = {}
    for r in existing_steps_rows:
        f = r.get("fields", {})
        step_num = int(f.get("Step")) if f.get("Step") is not None else None # Step might be numeric float from Graph; normalize to int
        if step_num is not None: existing_steps_map[step_num] = r

    # 4) Build steps_to_upsert list from procedure object
    # Prefer `procedure.steps` if parsed; otherwise fall back to flattening procedure.lists[].list_txt
    steps_to_upsert = []
    if hasattr(procedure, "steps") and procedure.steps:
        for i, s in enumerate(procedure.steps, start=1):
            txt = s.get("text") if isinstance(s, dict) else str(s)
            img = (s.get("image") if isinstance(s, dict) else None) or ""
            steps_to_upsert.append({"step": i, "text": txt, "image": img})
    else:
        # fall back: flatten procedure.lists[*].list_txt lines sequentially
        step_index = 1
        for sub in getattr(procedure, "lists", []) or []:
            list_txt = sub.get("list_txt") or ""
            lines = [ln.strip() for ln in list_txt.splitlines() if ln.strip()]
            for ln in lines:
                # join lines for multi-line logical step? this simplistic approach treats each non-empty line as a step
                steps_to_upsert.append({"step": step_index, "text": ln, "image": (sub.get("associated_images") or [None])[0] or ""})
                step_index += 1

    # 5) Upsert each step: update if exists else create
    touched_step_nums = set()
    for s in steps_to_upsert:
        sn = int(s["step"])
        touched_step_nums.add(sn)
        existing = existing_steps_map.get(sn)
        payload = {
            "Title": f"Step {sn}",
            "ProcedureIdLookupId": int(procedure_id),
            "Step": sn,
            "Text": s.get("text") or "",
            f"{os.getenv("INTERNALCOLUMN_IMAGE")}": s.get("image") or "",
        }
        if existing:
            existing_item_id = existing["id"]
            _update_list_item(site_id, steps_list_id, existing_item_id, payload)
            print(f"Updated step {sn} (item {existing_item_id})")
        else:
            created = _add_list_item(site_id, steps_list_id, payload)
            # created likely returns dict with id/webUrl; get id if present
            created_id = created.get("id") if isinstance(created, dict) and created.get("id") else None
            print(f"Created step {sn} (item {created_id})")

    # 6) Optional: mark or remove stale steps that existed but are not in the new set
    # existing_step_nums = set(existing_steps_map.keys())
    # stale = existing_step_nums - touched_step_nums
    # if stale:
    #     print("Stale steps detected:", stale)
    #     # OPTION A: mark inactive column (recommended)
    #     # For each stale step id: update_list_item(site_id, steps_list_id, item_id, {"IsActive": False})
    #     # OPTION B: delete hard (be careful)
    #     # for each item_id in stale: delete_list_item(site_id, steps_list_id, item_id)
