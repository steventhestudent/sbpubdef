from azure_function.sbpubdef.local_upload import os, authenticate, get_site_id, get_list_id, get_list_column_names

authenticate()
site_id = get_site_id(os.getenv("HUB_NAME"))
list_id = get_list_id(site_id, os.getenv("LIST_PROCEDURECHECKLIST"))
print(get_list_column_names(site_id, list_id, include_sp_cols=False))