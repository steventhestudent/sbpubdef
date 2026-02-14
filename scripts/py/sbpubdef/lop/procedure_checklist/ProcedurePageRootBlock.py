import os
from .upload_file import *

class ProcedurePageRootBlock:
    def __init__(self, doc_filename, page_index, image_counter_ref, block, out_dir): # example self.obj["blocks"][0]: 612.0 792.0 {'type': 0, 'number': 0, 'flags': 0, 'bbox': [156.4799041748047, 46.36137390136719, 572.9722900390625, 118.07557678222656], 'lines': [{'spans': [{'size': 32.299373626708984, 'flags': 16, 'bidi': 0, 'char_flags': 24, 'font': 'ArialNarrow-Bold', 'color': 600918, 'alpha': 255, 'ascender': 0.9319999814033508, 'descender': -0.20999999344348907, 'text': 'County of Santa Barbara', 'origin': [217.19000244140625, 72.969970703125], 'bbox': [217.19000244140625, 46.36137390136719, 572.9546508789062, 78.96546936035156]}], 'wmode': 0, 'dir': [1.0, 0.0], 'bbox': [217.19000244140625, 46.36137390136719, 572.9546508789062, 78.96546936035156]}, {'spans': [{'size': 32.299373626708984, 'flags': 16, 'bidi': 0, 'char_flags': 24, 'font': 'ArialNarrow-Bold', 'color': 600918, 'alpha': 255, 'ascender': 0.9319999814033508, 'descender': -0.20999999344348907, 'text': 'Office of the Public Defender', 'origin': [156.4799041748047, 112.080078125], 'bbox': [156.4799041748047, 85.47148132324219, 572.9722900390625, 118.07557678222656]}], 'wmode': 0, 'dir': [1.0, 0.0], 'bbox': [156.4799041748047, 85.47148132324219, 572.9722900390625, 118.07557678222656]}]}
        self.obj = block
        self.out_dir = out_dir
        if block["type"] == 0: pass # type=0, number, flags, bbox, lines
        elif block["type"] == 1:    # type=1, number, bbox, width, height, ext, colorspace, xres, yres, bpc, transform, size, image, mask
            image_counter_ref["count"] += 1
            self.extract_image_block(doc_filename, page_index, image_counter_ref["count"]) # base64 blob => url

    def extract_image_block(self, doc_filename, page_index, img_index):
        ext = ("jpg" if self.obj["ext"] == "jpeg" else self.obj.get("ext", "png")).lower()
        filename = f"{doc_filename}-p{page_index+1}-img{img_index}.{ext}"
        local_path = os.path.join(self.out_dir + "/img", filename)
        with open(local_path, "wb") as f: f.write(self.obj["image"]) # save locally
        self.obj["image"] = upload_file(local_path) # upload_to_sharepoint(local_path) # upload block["image"] as <documentfilename>-<page#>-<img#>.<ext> to sharepoint document library & replace with item url
        self.obj["mask"] = None # another base64, we don't need it
