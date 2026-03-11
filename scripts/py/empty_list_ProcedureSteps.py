from azure_function.sbpubdef.local_upload import os, authenticate, get_site_id, get_list_id, get_list_items, get_list_column_names, update_list_item, odata_escape, delete_list_item

# Example usage
authenticate()
site_id = get_site_id(os.getenv("HUB_NAME"))
list_id = get_list_id(site_id, os.getenv("LIST_PROCEDURESTEPS"))

rows = get_list_items(site_id, list_id, fields_filter=f"", top=999)
while len(rows) > 0:
	for row in rows:
		delete_list_item(site_id, list_id, row.get("id"))
	print(f"finished deleting f{len(rows)}")
	rows = get_list_items(site_id, list_id, fields_filter=f"", top=999)

print("done.")