from azure_function.sbpubdef.local_upload import os, authenticate, get_site_id, get_list_id, get_list_items, get_list_column_names, update_list_item, odata_escape

authenticate()
site_id = get_site_id(os.getenv("HUB_NAME"))

# list_id = get_list_id(site_id, os.getenv("LIST_PROCEDURESTEPS"))
# rows = get_list_items(site_id, list_id, fields_filter=f"fields/ProcedureIdLookupId eq 6", top=999)
# if (len(rows)) > 0: # update step 1 if exists
#     fields = rows[0].get("fields")
#     print(fields)
#     update_list_item(site_id, list_id, rows[0].get("id"), {
#         'Title': fields.get("Title"),
#         'ProcedureId': fields.get("ProcedureIdLookupId"),
#         'Step': fields.get("Step"),
#         'Text': fields.get("Text"),
#         f"{os.getenv("INTERNALCOLUMN_IMAGE")}": "my new image" # fields.get(os.getenv("INTERNALCOLUMN_IMAGE")),
#     })

# list_id = get_list_id(site_id, os.getenv("LIST_PROCEDURECHECKLIST"))
# filename = "2024-09-01_-SOP_Miscellaneous-Consults"
# rows = get_list_items(site_id, list_id, fields_filter=f"fields/Filename eq '{odata_escape(filename)}'")
# if (len(rows)) > 0:
#     fields = rows[0].get("fields")
#     update_list_item(site_id, list_id, rows[0].get("id"), {
#         'Title': fields.get("Title"),
#         'Category': fields.get("Category"),
#         'Filename': fields.get("Filename"),
#         'EffectiveDate': fields.get("EffectiveDate"),
#         'PageCount': fields.get("PageCount"),
#         'json': "we modify this column one (test update)", # fields.get("json")
#         'DocumentURL': fields.get("DocumentURL")
#     })
