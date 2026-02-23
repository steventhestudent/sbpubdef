import os
import json
import pymupdf # import fitz

from .ProcedurePage import *
from .upload import *

class ProcedureChecklist:
    def __init__(self, pdf_path, category, out_dir):
        self.resource_path = pdf_path
        self.filename = os.path.basename(self.resource_path)[:-4]
        self.category = category
        self.out_dir = out_dir
        self.title = ''           # find in process (Procedure: name)
        self.effective_date = ''  # find in process (Effective Date: September 1, 2024)
        self.purpose = ''         # find in process (Purpose: ... stop at 1st image/list/block)
        self.version_history = [] # find in process (Version History: table(version, date, edits, approved_by))
        self.pages = []           # ProcedurePage[]
        self.lists = []          # list sections w/ associated_images
        self.document_URL = upload_file(self.resource_path)
        self.json_URL = ""
        self.process_resource()

    def write(self):
        file_path = os.path.join(self.out_dir, self.filename + '.json')
        with open(file_path, 'w') as file: json.dump(self.serialize(), file, indent=2)
        self.json_URL = upload_file(file_path)
        print(add_list_item(self)) # new sharepoint list item url

    def serialize(self):
        return {
            "category": self.category,
            "filename": self.filename,
            "title": self.title,
            "effectiveDate": self.effective_date,
            "purpose": self.purpose,
            "versionHistory": self.version_history,
            "pageCount": len(self.pages),
            "documentURL": self.document_URL,
            "lists": self.lists # [{ "slideBlocks": [block.obj for block in page.blocks] } for page in self.pages]
        }

    def process_resource(self):
        for i, page in enumerate(pymupdf.open(self.resource_path)): # first we create ProcedurePage & process text
            procedure_page = ProcedurePage(self.filename, i, page)
            self.pages.append(procedure_page)
            if i == 0:
                (title, effective_date, purpose) = procedure_page.pg1_metadata() # ProcedureChecklist pdf's struct consistently has structure metadata page 1 -> procedure lists -> version control
                self.title = title
                self.effective_date = effective_date
                self.purpose = purpose
                print(title, effective_date, purpose)
            self.version_history = procedure_page.best_effort_version_history(self.version_history) # could start on any page and (if long enough) end on another page
            # break # debug 1 page
        for page in self.pages: # now we process blocks for images, etc.
            page.process_blocks(self.out_dir) # associate images with lists
        self.write()
