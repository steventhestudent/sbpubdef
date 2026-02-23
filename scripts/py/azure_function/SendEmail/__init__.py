import json
import logging
import azure.functions as func

from ..sbpubdef.local_upload import authenticate, send_email

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info("HTTP trigger function processed a request.")
    try:
        data = req.get_json()
    except Exception:
        data = {}
    to_email = data.get("to_email")
    subject = data.get("subject")
    body = data.get("body")
    if not all([to_email, subject, body]): return func.HttpResponse(json.dumps({"err": "Missing to_email, subject, or body"}),status_code=400,mimetype="application/json",)
    authenticate()
    result = send_email(to_email, subject, body, content_type=data.get("content_type"), sender_upn="sbpubdef@csproject25.onmicrosoft.com")
    if result["success"]: return func.HttpResponse(json.dumps({"success": True}), mimetype="application/json")
    return func.HttpResponse(json.dumps({"err": result["err"]}), status_code=500, mimetype="application/json")
