from ...local_upload import authenticate, upload_file as _upload_file, get_site_id, get_drive_id

authenticate()
site_id = get_site_id("PD-Intranet")
drive_id = get_drive_id(site_id, "user_uploads")

def upload_file(file_path):
    return _upload_file(file_path, site_id, drive_id, "resource/LOP/ProcedureChecklist")
