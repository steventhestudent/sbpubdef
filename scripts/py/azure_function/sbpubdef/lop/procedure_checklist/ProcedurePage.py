import re
from .ProcedurePageRootBlock import ProcedurePageRootBlock

class ProcedurePage:
    def __init__(self, doc_filename, page_index, pymupdf_page): # dict keys: {width, height, blocks: [...]} ——always ~612x792, so only 'blocks' differs
        self.txt = pymupdf_page.get_text()
        self.blocks = pymupdf_page.get_text("dict")["blocks"]
        self.doc_filename = doc_filename
        self.page_index = page_index
        self.width = float(getattr(pymupdf_page, "rect", {}).width) if getattr(pymupdf_page, "rect", None) else 612.0
        self.height = float(getattr(pymupdf_page, "rect", {}).height) if getattr(pymupdf_page, "rect", None) else 792.0

    def process_blocks(self, out_dir):
        # Use a single counter for the whole page so extracted images get unique filenames.
        image_counter_ref = {"count": 0}
        self.blocks = [
            ProcedurePageRootBlock(self.doc_filename, self.page_index, image_counter_ref, block, out_dir)
            for block in self.blocks
        ]

    def iter_positioned_lines(self):
        """
        Yield dicts: { "type": "line", "y0": float, "y1": float, "x0": float, "x1": float, "text": str, "is_bold": bool }
        Requires `process_blocks()` to have been called (so blocks are ProcedurePageRootBlock objects).
        """
        for rb in self.blocks:
            b = rb.obj
            if b.get("type") != 0:
                continue
            for ln in b.get("lines", []) or []:
                spans = ln.get("spans", []) or []
                parts = []
                bold_chars = 0
                total_chars = 0
                for sp in spans:
                    t = sp.get("text") or ""
                    if not t:
                        continue
                    parts.append(t)
                    total_chars += len(t)
                    # PyMuPDF: span["flags"] bit 16 typically indicates bold in practice for these docs.
                    if (sp.get("flags", 0) & 16) != 0:
                        bold_chars += len(t)
                text = "".join(parts).strip()
                if not text:
                    continue
                x0, y0, x1, y1 = None, None, None, None
                bb = ln.get("bbox") or []
                if len(bb) == 4:
                    x0, y0, x1, y1 = float(bb[0]), float(bb[1]), float(bb[2]), float(bb[3])
                is_bold = (total_chars > 0 and (bold_chars / total_chars) >= 0.6)
                yield {
                    "type": "line",
                    "x0": x0 if x0 is not None else 0.0,
                    "x1": x1 if x1 is not None else 0.0,
                    "y0": y0 if y0 is not None else 0.0,
                    "y1": y1 if y1 is not None else 0.0,
                    "text": text,
                    "is_bold": is_bold,
                }

    def iter_images(self):
        """
        Yield dicts: { "type": "image", "y0": float, "y1": float, "x0": float, "x1": float, "url": str }
        Requires `process_blocks()` to have been called (so blocks are ProcedurePageRootBlock objects).
        """
        for rb in self.blocks:
            b = rb.obj
            if b.get("type") != 1:
                continue
            bb = b.get("bbox") or []
            if len(bb) != 4:
                continue
            url = b.get("image") or ""
            yield {"type": "image", "x0": float(bb[0]), "y0": float(bb[1]), "x1": float(bb[2]), "y1": float(bb[3]), "url": url}

    def iter_content_elements(self):
        """
        Merge positioned lines + images in top-to-bottom order for this page.
        """
        els = list(self.iter_positioned_lines()) + list(self.iter_images())
        els.sort(key=lambda e: (e.get("y0", 0.0), 0 if e["type"] == "line" else 1))
        return els

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
