import os
import json
import pymupdf # import fitz
import re

from .ProcedurePage import ProcedurePage
from .upload import *

class ProcedureChecklist:
	def __init__(self, pdf_path, category, out_dir, *, procedure_list_item_id=None, force_new_list_item=False):
		self.resource_path = pdf_path
		self.filename = os.path.basename(self.resource_path)[:-4]
		self.category = category
		self.out_dir = out_dir
		self.title = ''           # find in process (Procedure: name)
		self.effective_date = ''  # find in process (Effective Date: September 1, 2024)
		self.purpose = ''         # find in process (Purpose: ... stop at 1st image/list/block)
		self.version_history = [] # find in process (Version History: table(version, date, edits, approved_by)) (unreliable extraction / don't care about in webpart)
		self.pages = []           # ProcedurePage[]
		self.steps = []          # a step is {Step: 1, Title: "", Text: "1. lorem ipsum... 2. lorem ipsum...", Image: "https://"}
		self.document_URL = ""
		self.json_URL = ""
		self.procedure_list_item_id = procedure_list_item_id
		self.force_new_list_item = bool(force_new_list_item)

	def run(self, *, field_overrides: dict | None = None):
		"""Upload source PDF, parse, upload JSON + images, upsert SharePoint list rows (same pipeline as LOP_process_pdfs)."""
		self.document_URL = upload_file(self.resource_path)
		self.process_resource(finalize=False)
		if field_overrides:
			if str(field_overrides.get("title") or "").strip():
				self.title = str(field_overrides["title"]).strip()
			if str(field_overrides.get("purpose") or "").strip():
				self.purpose = str(field_overrides["purpose"]).strip()
			if str(field_overrides.get("category") or "").strip():
				self.category = str(field_overrides["category"]).strip()
			if str(field_overrides.get("effectiveDate") or "").strip():
				self.effective_date = str(field_overrides["effectiveDate"]).strip()
		return self.write()

	def _is_footer_or_header_line(self, text: str, y0: float, page_height: float):
		t = (text or "").strip()
		if not t:
			return True
		# Standalone page numbers sometimes appear as their own line.
		if re.match(r"^\d+$", t):
			return True
		# Common header lines in these SOPs.
		if t in ("County of Santa Barbara", "Office of the Public Defender"):
			return True
		if t.startswith("Procedure:") or t.startswith("Procedure :"):
			return True
		if t.startswith("Effective Date"):
			return True
		# Page counter footer line from many PDFs.
		if re.match(r"^--\s*\d+\s+of\s+\d+\s*--$", t):
			return True
		# Heuristic positional trimming.
		if y0 is not None and (y0 < 125.0 or y0 > (page_height - 55.0)):
			# Keep PURPOSE and steps even if high-ish; but headers are typically in the very top band.
			if t.startswith("PURPOSE") or re.match(r"^\s*\d+\.\s*", t):
				return False
			return True
		return False

	def _is_non_content_image(self, el: dict):
		# Ignore header logos, footer stamps, and tiny decorative/stamp images.
		y0 = el.get("y0")
		y1 = el.get("y1")
		x0 = el.get("x0")
		x1 = el.get("x1")
		ph = el.get("page_height") or 792.0
		if y0 is None or y1 is None:
			return False
		if y0 < 140.0:
			return True
		if y0 > (ph - 120.0):
			return True
		# Size-based filter (stamps/logos are often small compared to screenshots).
		if x0 is not None and x1 is not None:
			w = float(x1) - float(x0)
			h = float(y1) - float(y0)
			area = max(w, 0.0) * max(h, 0.0)
			if h < 95.0 and area < 25000.0:
				return True
		return False

	def _looks_like_step_heading(self, first_line: str, first_is_bold: bool):
		t = (first_line or "").strip()
		if not t:
			return False
		# Not a numbered list item.
		if re.match(r"^\s*(\d+\.|[a-zA-Z]\.|[ivxlcdmIVXLCDM]+\.)\s+", t):
			return False
		# Typical headings are short and either bold or end with ':'.
		if t.endswith(":"):
			return True
		if first_is_bold and len(t) <= 80:
			return True
		# ALL CAPS headings (common in some SOPs).
		alpha = re.sub(r"[^A-Za-z]+", "", t)
		if alpha and alpha.isupper() and len(t) <= 80:
			return True
		return False

	def build_steps(self):
		"""
		Build `self.steps` by:
		- ignoring header/footer and anything after 'Version History'
		- starting from first numbered instruction (e.g. '1.')
		- chunking text up to the next (non-footer) image, ideally 1 image per step
		"""
		elements = []
		for p in self.pages:
			ph = getattr(p, "height", 792.0) or 792.0
			for el in p.iter_content_elements():
				el = dict(el)
				el["page_index"] = p.page_index
				el["page_height"] = ph
				elements.append(el)

		# Sort across pages.
		elements.sort(key=lambda e: (e.get("page_index", 0), e.get("y0", 0.0), 0 if e["type"] == "line" else 1))

		# Filter to the procedure content region.
		started = False
		content = []
		for el in elements:
			if el["type"] == "line":
				txt = el.get("text") or ""
				if "Version History" in txt:
					break
				if self._is_footer_or_header_line(txt, el.get("y0"), el.get("page_height")):
					continue
				if not started:
					# Start at first numbered step.
					if re.match(r"^\s*1\.\s+", txt):
						started = True
						content.append(el)
					continue
				# Once started, skip stray PURPOSE line repeats (some PDFs echo it in reading order).
				if txt.startswith("PURPOSE"):
					continue
				content.append(el)
			else:
				# Image
				if not started:
					continue
				if self._is_non_content_image(el):
					continue
				# If we haven't hit Version History yet, keep images.
				content.append(el)

		# Chunk into steps: accumulate text until next image.
		steps = []
		cur_lines = []
		cur_first_line_bold = False
		cur_image = ""
		pending_image = ""

		def flush():
			nonlocal cur_lines, cur_image, cur_first_line_bold
			body_lines = [l for l in cur_lines if l.strip()]
			if not body_lines and not cur_image:
				cur_lines = []
				cur_first_line_bold = False
				return
			title = ""
			text = "\n".join(body_lines).strip()
			if body_lines:
				first = body_lines[0].strip()
				if self._looks_like_step_heading(first, cur_first_line_bold):
					title = first[:-1].strip() if first.endswith(":") else first
					# Remove the heading line from the body text (keeps it as title).
					text = "\n".join(body_lines[1:]).strip()
			steps.append({
				"step": len(steps) + 1,
				"title": title,
				"text": text,
				"image": cur_image or ""
			})
			cur_lines = []
			cur_first_line_bold = False
			cur_image = ""

		for el in content:
			if el["type"] == "line":
				if pending_image and not cur_image and not cur_lines:
					cur_image = pending_image
					pending_image = ""
				if not cur_lines:
					cur_first_line_bold = bool(el.get("is_bold"))
				cur_lines.append(el.get("text") or "")
			else:
				# Attach this image to the accumulated text chunk.
				img_url = el.get("url") or ""
				if not cur_lines:
					# Don't create an empty step; attach to the next text chunk instead.
					pending_image = img_url
					continue
				cur_image = img_url
				flush()

		# Final trailing text-only chunk (for docs with no images or leftover text after last image).
		flush()

		# If we ended up with many tiny steps (e.g. one line per step), keep as-is; caller can re-chunk later.
		self.steps = steps

	def write(self):
		file_path = os.path.join(self.out_dir, self.filename + '.json')
		with open(file_path, 'w') as file: json.dump(self.serialize(), file, indent=2)
		self.json_URL = upload_file(file_path)
		return add_or_update_lists(self) # add / update LOPProcedureChecklist + ProcedureSteps

	def serialize(self):
		d = self.__dict__.copy()
		[d.pop(key, None) for key in ('resource_path', 'lists', 'pages', 'json_URL', 'version_history', 'out_dir', 'procedure_list_item_id', 'force_new_list_item')]
		d["pageCount"] = len(self.pages)
		d["title"] = ",".join(d["title"]) if type(d["title"]) == list else d["title"]
		d["steps"] = [ { "Step": l["step"], "Title": l["title"], "Text": l["text"], "Image": l["image"] } for l in self.steps ] # old is too complex: [ { "list_page_range": l["list_page_range"], "list_txt": l["list_txt"], "associated_images": l["associated_images"] } for l in self.lists ]                —— (we just need reasonable chunking of the list portions (or main content (non-purpose/header-title)) of pdf such that ideally there is 1 step/chunk/item for every image))
		return d

	def process_resource(self, *, finalize: bool = True):
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
		for page in self.pages:  # now we process blocks for images, etc.
			page.process_blocks(self.out_dir)
		self.build_steps()
		if finalize:
			self.write()
