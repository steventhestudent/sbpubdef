import os
from sbpubdef.lop.procedure_checklist import ProcedureChecklist

# config
SCRAPED_LOP_PAGE_RESOURCES = "~/proj/work/sbpubdef/resource/LOP"

SCRAPED_LOP_PAGE_RESOURCES = os.path.expanduser(SCRAPED_LOP_PAGE_RESOURCES)
LOCAL_OUT_DIR = os.path.join(SCRAPED_LOP_PAGE_RESOURCES, ".json_pdfs")
# mkdir -p .json_pdfs .json_pdfs/img
if not os.path.exists(LOCAL_OUT_DIR): os.makedirs(LOCAL_OUT_DIR)
if not os.path.exists(LOCAL_OUT_DIR + "/img"): os.makedirs(LOCAL_OUT_DIR + "/img")
# to modify document library OUT_DIR, see: sbpubdef.local_upload

procedure_checklists = []

# walk resource dir
ignored = []
for root, dirs, files in os.walk(SCRAPED_LOP_PAGE_RESOURCES):
    for filename in files:
        filepath = os.path.join(root, filename)
        category = os.path.basename(root) # dir name == header/category the pdf is under (Interpreting Resources, Forms, etc.)
        if category == "Forms" or category == "Contacts": continue # not a procedure
        if not(filename.endswith('.pdf')):
            if not(filename.endswith('.DS_Store')): ignored.append(f'{category}/{filename}')
            continue
        procedure_checklists.append(ProcedureChecklist(filepath, category, LOCAL_OUT_DIR))
    if len(procedure_checklists) == 1: break # debug 1 pdf
