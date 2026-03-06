import re
from .ProcedurePageRootBlock import ProcedurePageRootBlock

def block_text(block):
    """Extract plain text from a type-0 (text) block dict."""
    if block.get("type") != 0 or "lines" not in block:
        return ""
    return "\n".join(
        "".join(span.get("text", "") for span in line.get("spans", []))
        for line in block["lines"]
    )

# Ordered (1. 2. 1) 2)) / unordered (• - *) / roman (i. I. ii.) at line start
_LIST_ITEM_RE = re.compile(
    r"^\s*(?:\d+[.)]|[•\-*]|[iIvVxX]+\.|[a-zA-Z][.)])\s*",
    re.MULTILINE,
)

def block_is_list_item(block):
    """True if block looks like the start of or part of a list (first line matches list pattern)."""
    text = block_text(block).strip()
    if not text:
        return False
    first_line = text.split("\n")[0]
    return bool(_LIST_ITEM_RE.match(first_line))


class ProcedurePage:
    def __init__(self, doc_filename, page_index, pymupdf_page): # dict keys: {width, height, blocks: [...]} ——always ~612x792, so only 'blocks' differs
        self.txt = pymupdf_page.get_text()
        self.blocks = pymupdf_page.get_text("dict")["blocks"]
        self.doc_filename = doc_filename
        self.page_index = page_index

    def process_blocks(self, out_dir):
        self.blocks = [
            ProcedurePageRootBlock(self.doc_filename, self.page_index, {"count": 0}, block, out_dir) for block in self.blocks
        ]

    def best_effort_title(self): # todo: all documents have a title, only ~56% extracted w/ this (some are not prefixed by Procedure: (also, most that dont follow pattern come before Effective Date: (on same line)))
        m = re.search(r'Procedure:\s*(.+)', self.txt)
        return m.group(1).strip().split('    ') if m else ''

    def best_effort_version_history(self, current_version_history): # doesn't extract ANY version history table yet...
        if "Version History" in self.txt:
            section = self.txt.split("Version History", 1)[1]
            lines = [l.strip() for l in section.splitlines() if l.strip()]
            for line in lines: # crude detection of version-like lines
                if re.match(r'\d+(\.\d+)*', line): current_version_history.append({"raw": line})
        return current_version_history

    def pg1_metadata(self):
        effective_date = ''
        purpose = ''
        # --- Effective Date ---
        m = re.search(r'Effective Date:\s*(.+)', self.txt)
        if m: effective_date = m.group(1).strip()
        # --- Purpose --- # Capture everything after PURPOSE: until first numbered step (e.g. 1. i. I. etc.)
        m = re.search( r'PURPOSE:\s*(.+?)(\n\s*\d+\.)', self.txt, re.DOTALL)
        if m: purpose = m.group(1).strip()
        return [self.best_effort_title(), effective_date, purpose]
