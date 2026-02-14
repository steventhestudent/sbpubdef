import re
from .ProcedurePageRootBlock import ProcedurePageRootBlock

class ProcedurePage:
    def __init__(self, doc_filename, page_index, pymupdf_page, out_dir): # dict keys: {width, height, blocks: [...]} ——always ~612x792, so only 'blocks' differs
        self.txt = pymupdf_page.get_text()
        self.blocks = [
            ProcedurePageRootBlock(doc_filename, page_index, {"count": 0}, block, out_dir) for block in pymupdf_page.get_text("dict")["blocks"]
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
