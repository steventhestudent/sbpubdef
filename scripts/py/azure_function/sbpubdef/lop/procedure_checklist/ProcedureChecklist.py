import os
import json
import pymupdf # import fitz

from .ProcedurePage import block_text, block_is_list_item
from .ProcedurePage import ProcedurePage
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
        add_or_update_lists(self) # add / update LOPProcedureChecklist + ProcedureSteps

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
            "lists": [
                {"list_page_range": l["list_page_range"], "list_txt": l["list_txt"], "associated_images": l["associated_images"]}
                for l in self.lists
            ]
        }

    def _build_lists(self):
        """Partition text by ordered/unordered list chunks. Populates self.lists with list_page_range, list_txt, associated_images; keeps _list_block_ranges for image association."""
        current = None  # { "list_page_range": [start_p], "list_txt": "", "_list_block_ranges": [(page_idx, start_b, end_b), ...] }

        for page_idx, page in enumerate(self.pages):
            raw_blocks = page.blocks  # still raw dicts before process_blocks
            for block_idx, block in enumerate(raw_blocks):
                if block.get("type") != 0:
                    continue
                text = block_text(block)
                is_list = block_is_list_item(block)

                if is_list:
                    if current is None:
                        current = {
                            "list_page_range": [page_idx],
                            "list_txt": text,
                            "associated_images": [],
                            "_list_block_ranges": [(page_idx, block_idx, block_idx)],
                        }
                    else:
                        current["list_txt"] = (current["list_txt"] + "\n" + text).strip()
                        ranges = current["_list_block_ranges"]
                        if ranges and ranges[-1][0] == page_idx:
                            ranges[-1] = (page_idx, ranges[-1][1], block_idx)
                        else:
                            ranges.append((page_idx, block_idx, block_idx))
                else:
                    if current is not None:
                        # End current list: set end page; single-page => [p, p], multi-page => [start, end]
                        r = current["list_page_range"]
                        end_p = current["_list_block_ranges"][-1][0]
                        if len(r) == 1 and end_p != r[0]:
                            r.append(end_p)
                        elif len(r) == 1:
                            r.append(r[0])  # [p, p] for same page
                        self.lists.append(current)
                        current = None
                    # non-list block is not accumulated

        if current is not None:
            r = current["list_page_range"]
            end_p = current["_list_block_ranges"][-1][0]
            if len(r) == 1 and end_p != r[0]:
                r.append(end_p)
            elif len(r) == 1:
                r.append(r[0])
            self.lists.append(current)

    def _list_containing_block(self, page_idx, block_idx):
        """Return index into self.lists for the list that contains this (page, block), e.g. for image association.
        Prefer list whose text range [start_b, end_b] includes block_idx; else list whose range on this page
        ends just before block_idx (image between list segments).
        """
        best_i, best_end = None, -1
        for i, lst in enumerate(self.lists):
            ranges = lst.get("_list_block_ranges")
            if not ranges:
                continue
            for (p, start_b, end_b) in ranges:
                if p != page_idx:
                    continue
                if start_b <= block_idx <= end_b:
                    return i
                if end_b < block_idx and end_b > best_end:
                    best_end, best_i = end_b, i
        return best_i

    def _associate_images_to_lists(self):
        """After process_blocks: assign each image block to the list that contains its (page, block_idx)."""
        # Rebuild list_block_ranges from current self.lists (we didn't keep _list_block_ranges on serializable items)
        # So we must keep _list_block_ranges on each list until after this pass. Currently _build_lists appends
        # items without _list_block_ranges to self.lists... so we need to keep _list_block_ranges in _build_lists
        # and only strip it when serializing.
        for page_idx, page in enumerate(self.pages):
            for block_idx, block in enumerate(page.blocks):
                if getattr(block, "obj", None) and block.obj.get("type") == 1:
                    li = self._list_containing_block(page_idx, block_idx)
                    if li is not None:
                        # Append serializable image block (url already in block.obj["image"])                        img.pop("mask", None)
                        self.lists[li]["associated_images"].append(block.obj.get("image"))
        for lst in self.lists:
            lst.pop("_list_block_ranges", None)

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
        self._build_lists()
        for page in self.pages:  # now we process blocks for images, etc.
            page.process_blocks(self.out_dir)
        self._associate_images_to_lists()
        self.write()
