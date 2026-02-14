import os
import re
import json
import pymupdf # import fitz

# config
SCRAPED_LOP_PAGE_RESOURCES = "~/proj/work/sbpubdef/resource/LOP"

# mkdir -p .json_pdfs
SCRAPED_LOP_PAGE_RESOURCES = os.path.expanduser(SCRAPED_LOP_PAGE_RESOURCES)
OUT_DIR = os.path.join(SCRAPED_LOP_PAGE_RESOURCES, ".json_pdfs")
if not os.path.exists(OUT_DIR): os.makedirs(OUT_DIR)
if not os.path.exists(OUT_DIR + "/img"): os.makedirs(OUT_DIR + "/img")

procedure_checklists = []

class PageRootBlock:
    def __init__(self, doc_filename, page_index, image_counter_ref, block): # example self.obj["blocks"][0]: 612.0 792.0 {'type': 0, 'number': 0, 'flags': 0, 'bbox': [156.4799041748047, 46.36137390136719, 572.9722900390625, 118.07557678222656], 'lines': [{'spans': [{'size': 32.299373626708984, 'flags': 16, 'bidi': 0, 'char_flags': 24, 'font': 'ArialNarrow-Bold', 'color': 600918, 'alpha': 255, 'ascender': 0.9319999814033508, 'descender': -0.20999999344348907, 'text': 'County of Santa Barbara', 'origin': [217.19000244140625, 72.969970703125], 'bbox': [217.19000244140625, 46.36137390136719, 572.9546508789062, 78.96546936035156]}], 'wmode': 0, 'dir': [1.0, 0.0], 'bbox': [217.19000244140625, 46.36137390136719, 572.9546508789062, 78.96546936035156]}, {'spans': [{'size': 32.299373626708984, 'flags': 16, 'bidi': 0, 'char_flags': 24, 'font': 'ArialNarrow-Bold', 'color': 600918, 'alpha': 255, 'ascender': 0.9319999814033508, 'descender': -0.20999999344348907, 'text': 'Office of the Public Defender', 'origin': [156.4799041748047, 112.080078125], 'bbox': [156.4799041748047, 85.47148132324219, 572.9722900390625, 118.07557678222656]}], 'wmode': 0, 'dir': [1.0, 0.0], 'bbox': [156.4799041748047, 85.47148132324219, 572.9722900390625, 118.07557678222656]}]}
        self.obj = block
        if block["type"] == 0: pass # type=0, number, flags, bbox, lines
        elif block["type"] == 1:    # type=1, number, bbox, width, height, ext, colorspace, xres, yres, bpc, transform, size, image, mask
            image_counter_ref["count"] += 1
            self.extract_image_block(doc_filename, page_index, image_counter_ref["count"]) # base64 blob => url

    def extract_image_block(self, doc_filename, page_index, img_index):
        ext = ("jpg" if self.obj["ext"] == "jpeg" else self.obj.get("ext", "png")).lower()
        filename = f"{doc_filename}-p{page_index+1}-img{img_index}.{ext}"
        local_path = os.path.join(OUT_DIR + "/img", filename)
        with open(local_path, "wb") as f: f.write(self.obj["image"]) # save locally
        self.obj["image"] = "" # upload_to_sharepoint(local_path) # upload block["image"] as <documentfilename>-<page#>-<img#>.<ext> to sharepoint document library & replace with item url
        self.obj["mask"] = None # another base64, we don't need it

class ProcedurePage:
    def __init__(self, doc_filename, page_index, pymupdf_page): # dict keys: {width, height, blocks: [...]} ——always ~612x792, so only 'blocks' differs
        self.txt = pymupdf_page.get_text()
        self.blocks = [
            PageRootBlock(doc_filename, page_index, {"count": 0}, block) for block in pymupdf_page.get_text("dict")["blocks"]
        ]

    def best_effort_title(self): # todo: all documents have a title, only ~56% extracted w/ this (some are not prefixed by Procedure: (also, most that dont follow pattern come before Effective Date: (on same line)))
        m = re.search(r'Procedure:\s*(.+)', self.txt)
        return m.group(1).strip().split('    ') if m else ''

    def best_effort_version_history(self): # doesn't extract ANY version history table yet...
        version_history = []
        if "Version History" in self.txt:
            section = self.txt.split("Version History", 1)[1]
            lines = [l.strip() for l in section.splitlines() if l.strip()]
            for line in lines:
                # crude detection of version-like lines
                if re.match(r'\d+(\.\d+)*', line):
                    version_history.append({
                        "raw": line
                    })

    def text_extraction(self):
        effective_date = ''
        purpose = ''
        # --- Effective Date ---
        m = re.search(r'Effective Date:\s*(.+)', self.txt)
        if m: effective_date = m.group(1).strip()
        # --- Purpose --- # Capture everything after PURPOSE: until first numbered step (e.g. 1. i. I. etc.)
        m = re.search( r'PURPOSE:\s*(.+?)(\n\s*\d+\.)', self.txt, re.DOTALL)
        if m: purpose = m.group(1).strip()
        return [self.best_effort_title(), effective_date, purpose, self.best_effort_version_history()]

class ProcedureChecklist:
    def __init__(self, pdf_path, category):
        self.resource_path = pdf_path
        self.filename = os.path.basename(self.resource_path)[:-4]
        self.category = category
        self.title = ''           # find in process (Procedure: name)
        self.effective_date = ''  # find in process (Effective Date: September 1, 2024)
        self.purpose = ''         # find in process (Purpose: ... stop at 1st image/list/block)
        self.version_history = [] # find in process (Version History: table(version, date, edits, approved_by))
        self.pages = []           # ProcedurePage[]
        self.slides = []          # come up with a clever way of splitting information for display in slideshow view (given that some lists too big for page. this should equal sharepoint list item json.)
        self.process_resource()

    def __repr__(self): return f"{self.category} (Procedure) filename: {self.filename} Title: {self.title or '_'}"

    def write(self):
        with open(os.path.join(OUT_DIR, self.filename + '.json'), 'w') as file: json.dump(self.serialize(), file, indent=2)

    def serialize(self):
        return {
            "category": self.category,
            "filename": self.filename,
            "title": self.title,
            "effectiveDate": self.effective_date,
            "purpose": self.purpose,
            "versionHistory": self.version_history,
            "slides": [
                { "slideBlocks": [block.obj for block in page.blocks] } for page in self.pages
            ]
        }

    def create_procedure_slides(self): # create sensible json output that lives in sharepoint list, consumed by slideshow webpart (this will involve re-imagining positions for blocks)
        pass

    def process_resource(self):
        for i, page in enumerate(pymupdf.open(self.resource_path)):
            self.pages.append(ProcedurePage(self.filename, i, page)) # fetch json (img, positions of img, text blocks (jsonraw is specific to the char))
            if i == 0:
                (title, effective_date, purpose, version_history) = self.pages[len(self.pages) - 1].text_extraction() # ProcedureChecklist pdf's struct consistently has structure metadata page 1 -> procedure lists -> version control
                self.title = title
                self.effective_date = effective_date
                self.purpose = purpose
                self.version_history = version_history
                print(title, effective_date, purpose, version_history)
            # break # debug 1 page
        self.create_procedure_slides()
        self.write()

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
      procedure_checklists.append(ProcedureChecklist(filepath, category))
  # if len(procedure_checklists) == 1: break # debug 1 pdf
