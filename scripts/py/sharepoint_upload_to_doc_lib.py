import os
from pathlib import Path
from dotenv import load_dotenv
import requests
import msal

load_dotenv(Path(__file__).resolve().parents[2] / "config/.env.dev")

# config
TENANT_NAME = "csproject25" # .sharepoint.com
SITE_NAME = "PD-Intranet"
# from EntraID App Registration ('pnp'):
TENANT_ID = os.getenv("AZURE_TENANT_ID") # Directory (tenant) ID
CLIENT_ID = os.getenv("AZURE_CLIENT_ID") # Application (client) ID
CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET")

AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
SCOPE = ["https://graph.microsoft.com/.default"]

app = msal.ConfidentialClientApplication(
    CLIENT_ID,
    authority=AUTHORITY,
    client_credential=CLIENT_SECRET,
)

result = app.acquire_token_for_client(scopes=SCOPE)

if "access_token" not in result:
    raise Exception(result)

headers = {
    "Authorization": f"Bearer {result['access_token']}"
}

# if this worked...
# result = {'token_type': 'Bearer', 'expires_in': 3599, 'ext_expires_in': 3599, 'access_token': 'eyJ0eXAiOiJKV1QiLCJub25jZSI6IlotUDh1WTUtSWRyN05mMEtlVl9LenY4cW9ZNjR6RkJMTlFmcTBSdDd4NnMiLCJhbGciOiJSUzI1NiIsIng1dCI6InNNMV95QXhWOEdWNHlOLUI2ajJ4em1pazVBbyIsImtpZCI6InNNMV95QXhWOEdWNHlOLUI2ajJ4em1pazVBbyJ9.eyJhdWQiOiJodHRwczovL2dyYXBoLm1pY3Jvc29mdC5jb20iLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC9lMmFjZmVkNC0yZTBlLTQ1NGYtYjYyOC1lZDc0ZTA3YWYxM2IvIiwiaWF0IjoxNzcwOTk4NTA5LCJuYmYiOjE3NzA5OTg1MDksImV4cCI6MTc3MTAwMjQwOSwiYWlvIjoiazJaZ1lEaTAzK2hveGdJOThTVThqZWVqNVY1K0J3QT0iLCJhcHBfZGlzcGxheW5hbWUiOiJwbnAiLCJhcHBpZCI6ImRhYmUxMTJhLWQzMjAtNGE0Ni05OWVjLWYyZjk5MDAzOTM5MyIsImFwcGlkYWNyIjoiMSIsImlkcCI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0L2UyYWNmZWQ0LTJlMGUtNDU0Zi1iNjI4LWVkNzRlMDdhZjEzYi8iLCJpZHR5cCI6ImFwcCIsIm9pZCI6IjA5MjIzZjg3LWRiZmMtNGMxZC05ZDU4LTA1MTJjYTliMWMyZiIsInJoIjoiMS5BVzhCMVA2czRnNHVUMFcyS08xMDRIcnhPd01BQUFBQUFBQUF3QUFBQUFBQUFBQUFBQUJ2QVEuIiwic3ViIjoiMDkyMjNmODctZGJmYy00YzFkLTlkNTgtMDUxMmNhOWIxYzJmIiwidGVuYW50X3JlZ2lvbl9zY29wZSI6Ik5BIiwidGlkIjoiZTJhY2ZlZDQtMmUwZS00NTRmLWI2MjgtZWQ3NGUwN2FmMTNiIiwidXRpIjoiYlNReVNNWDVQRW1iMnhyR0lESXBBQSIsInZlciI6IjEuMCIsIndpZHMiOlsiMDk5N2ExZDAtMGQxZC00YWNiLWI0MDgtZDVjYTczMTIxZTkwIl0sInhtc19hY2QiOjE3NzA5OTY5MjcsInhtc19hY3RfZmN0IjoiMyA5IiwieG1zX2Z0ZCI6ImlTMXlHRDNISUh2UnFOcXlkWGNYTm5HWlBsc0lhZ1oyckRqSi1QWlY4TTRCZFhOM1pYTjBNeTFrYzIxeiIsInhtc19pZHJlbCI6IjggNyIsInhtc19yZCI6IjAuNDJMallCSmllczhrSk1MQkxpU1EyYWkwcFZMYTBXUEMzdnd2VzM0NWFRSkZPWVVFZEM5TW1EZ3A5cGZEdlBYYmpkMS1TTzRFaW5JSUNUQXpRTUFCS0EwVTVSWVNVUGpFRjh5VjZPTDAxbFotVXNUUGZVVUEiLCJ4bXNfc3ViX2ZjdCI6IjMgOSIsInhtc190Y2R0IjoxNzYwMTMwMDE3LCJ4bXNfdG50X2ZjdCI6IjMgMTIifQ.L02e8YI_TKN8oJlTgI9VZfMr8s0BwBy_G7kQwexFhTiBCYPG4TEhhi5QNXvB2ARMuzGUzk2TpNOjpP1vL6ol4h1I0EjDUMbE5LhBZDyhVAXsV1o3QJmDpKTyOlIJZDCwJn2B9Q1sg2ONwWKrR2DGOmBEHQHhf1sFhprRfmX6G6Yt5eFQmFq1-jFh5guCC7qD2wltSOndSN0heE32Y0CJ-kqsi9YvFDyoGXAgg4Vw6Csk4AsJjzyx5M8AhO4FrBfVXfxt_ld6agdrG-9ksya0n78D_Ao3HAnzizZakX2DDzHKbgmFpgBI2DT1ZZ31z8eYNhwY05dr3YPy6q3ERvN-Ag', 'token_source': 'identity_provider'}
# headers = {'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJub25jZSI6IlotUDh1WTUtSWRyN05mMEtlVl9LenY4cW9ZNjR6RkJMTlFmcTBSdDd4NnMiLCJhbGciOiJSUzI1NiIsIng1dCI6InNNMV95QXhWOEdWNHlOLUI2ajJ4em1pazVBbyIsImtpZCI6InNNMV95QXhWOEdWNHlOLUI2ajJ4em1pazVBbyJ9.eyJhdWQiOiJodHRwczovL2dyYXBoLm1pY3Jvc29mdC5jb20iLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC9lMmFjZmVkNC0yZTBlLTQ1NGYtYjYyOC1lZDc0ZTA3YWYxM2IvIiwiaWF0IjoxNzcwOTk4NTA5LCJuYmYiOjE3NzA5OTg1MDksImV4cCI6MTc3MTAwMjQwOSwiYWlvIjoiazJaZ1lEaTAzK2hveGdJOThTVThqZWVqNVY1K0J3QT0iLCJhcHBfZGlzcGxheW5hbWUiOiJwbnAiLCJhcHBpZCI6ImRhYmUxMTJhLWQzMjAtNGE0Ni05OWVjLWYyZjk5MDAzOTM5MyIsImFwcGlkYWNyIjoiMSIsImlkcCI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0L2UyYWNmZWQ0LTJlMGUtNDU0Zi1iNjI4LWVkNzRlMDdhZjEzYi8iLCJpZHR5cCI6ImFwcCIsIm9pZCI6IjA5MjIzZjg3LWRiZmMtNGMxZC05ZDU4LTA1MTJjYTliMWMyZiIsInJoIjoiMS5BVzhCMVA2czRnNHVUMFcyS08xMDRIcnhPd01BQUFBQUFBQUF3QUFBQUFBQUFBQUFBQUJ2QVEuIiwic3ViIjoiMDkyMjNmODctZGJmYy00YzFkLTlkNTgtMDUxMmNhOWIxYzJmIiwidGVuYW50X3JlZ2lvbl9zY29wZSI6Ik5BIiwidGlkIjoiZTJhY2ZlZDQtMmUwZS00NTRmLWI2MjgtZWQ3NGUwN2FmMTNiIiwidXRpIjoiYlNReVNNWDVQRW1iMnhyR0lESXBBQSIsInZlciI6IjEuMCIsIndpZHMiOlsiMDk5N2ExZDAtMGQxZC00YWNiLWI0MDgtZDVjYTczMTIxZTkwIl0sInhtc19hY2QiOjE3NzA5OTY5MjcsInhtc19hY3RfZmN0IjoiMyA5IiwieG1zX2Z0ZCI6ImlTMXlHRDNISUh2UnFOcXlkWGNYTm5HWlBsc0lhZ1oyckRqSi1QWlY4TTRCZFhOM1pYTjBNeTFrYzIxeiIsInhtc19pZHJlbCI6IjggNyIsInhtc19yZCI6IjAuNDJMallCSmllczhrSk1MQkxpU1EyYWkwcFZMYTBXUEMzdnd2VzM0NWFRSkZPWVVFZEM5TW1EZ3A5cGZEdlBYYmpkMS1TTzRFaW5JSUNUQXpRTUFCS0EwVTVSWVNVUGpFRjh5VjZPTDAxbFotVXNUUGZVVUEiLCJ4bXNfc3ViX2ZjdCI6IjMgOSIsInhtc190Y2R0IjoxNzYwMTMwMDE3LCJ4bXNfdG50X2ZjdCI6IjMgMTIifQ.L02e8YI_TKN8oJlTgI9VZfMr8s0BwBy_G7kQwexFhTiBCYPG4TEhhi5QNXvB2ARMuzGUzk2TpNOjpP1vL6ol4h1I0EjDUMbE5LhBZDyhVAXsV1o3QJmDpKTyOlIJZDCwJn2B9Q1sg2ONwWKrR2DGOmBEHQHhf1sFhprRfmX6G6Yt5eFQmFq1-jFh5guCC7qD2wltSOndSN0heE32Y0CJ-kqsi9YvFDyoGXAgg4Vw6Csk4AsJjzyx5M8AhO4FrBfVXfxt_ld6agdrG-9ksya0n78D_Ao3HAnzizZakX2DDzHKbgmFpgBI2DT1ZZ31z8eYNhwY05dr3YPy6q3ERvN-Ag'}

# we can now upload!
resp = requests.get(
    "https://graph.microsoft.com/v1.0/sites?search=csproject25",
    headers=headers
)

print(resp.json())

# site_resp = requests.get(
#     f"https://graph.microsoft.com/v1.0/sites/{TENANT_NAME}.sharepoint.com:/sites/{SITE_NAME}",
#     headers=headers
# )
#
# site_id = site_resp.json()
# print(site_id)


# drives_resp = requests.get(
#     f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives",
#     headers=headers
# )
#
# drive_id = ""
# for d in drives_resp.json()["value"]:
#     print(d["name"], d["id"])
#     if d["name"] == "user_uploads": drive_id = d["id"]

# file_path = "/Users/super/proj/work/sbpubdef/resource/LOP/.json_pdfs/img/2020-08-24_Mail-Procedure-p1-img1.jpg"
# file_name = "2020-08-24_Mail-Procedure-p1-img1.jpg"
#
# with open(file_path, "rb") as f:
#     upload_resp = requests.put(
#         f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives/{drive_id}/root:/LOP/{file_name}:/content",
#         headers=headers,
#         data=f
#     )
#
# upload_data = upload_resp.json()
# print(upload_data)

# web_url = upload_data["webUrl"]
# print("SharePoint URL:", web_url)
