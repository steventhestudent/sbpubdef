from sbpubdef.local_upload import authenticate, get_site_id, get_list_id, get_list_column_names

authenticate()
site_id = get_site_id("PD-Intranet")
list_id = get_list_id(site_id, "LOPProcedureChecklist")
print(get_list_column_names(site_id, list_id, include_sp_cols=False))