# transfer of work  
  
1. Choose m365 business premium (has **feature complete** Entra ID  —needed in order to define *role groups* for Azure Function's), (not yet configured, see: # Azure Functions)  
2. optional _CSLA Dev Project_ teams group:  add in **Active teams and groups** [https://admin.cloud.microsoft/?trysignin=0#/groups](https://admin.cloud.microsoft/?trysignin=0#/groups)  
3. Create New Communication Site: PD Intranet
   1. **Site Settings:** /sites/PD-Intranet/_layouts/15/settings.aspx  
      1. ...  
   2. **optional:**  make it a hub (if you want extra top bar of nav links / site collection associations), **note:** after installing solution, _ThemeInjector_  hides it)

- update config/
    - .env.public.prod
    - .env.prod
    - package-solution.json
        - webApiPermissionRequests from app registration: Application (client) ID + scope name
    - scripts/py/azure_function
        - set AZURE_FUNCTIONS_ENVIRONMENT to any value to ensure they use production
    - scripts/js (gen-env)
        - ensure that process.env.NODE_ENV === "production"

  
# Entra ID -> Groups -> Security Groups  

| displayName | id | groupType | membershipType | mail | source | mailEnabled | onPremisesSyncEnabled |
| ----------------- | ------------------------------------ | --------- | -------------- | ---- | ------ | ----------- | --------------------- |
| Attorney | f9e66388-efe6-4b94-811c-a0890a51ea73 | Security | assigned |  | Cloud | False |  |
| CDD | f16e8da5-04df-4d3e-93f2-400752a4ab14 | Security | assigned |  | Cloud | False |  |
| ComplianceOfficer | f7262977-8900-4b64-99e1-378db87fcf35 | Security | assigned |  | Cloud | False |  |
| HR | 26a2d26f-8019-4285-b682-90e491d77049 | Security | assigned |  | Cloud | False |  |
| IT | bb27ef32-d7fe-4ed5-81b8-b6237098d6aa | Security | assigned |  | Cloud | False |  |
| LOP | cc440ce9-6b0d-4ee0-bc18-1e8f65d498f9 | Security | assigned |  | Cloud | False |  |
| PDIntranet | 1a4bac58-bfe9-4ca5-9ed5-50b5d77c572c | Security | assigned |  | Cloud | False |  |
| TrialSupervisor | 8d69c597-971c-4c64-b7cb-a8078ab78d9f | Security | assigned |  | Cloud | False |  |
  
Security Groups csv export. Recreate these with (onPremisesSyncEnabled) or update *.public.env.dev* ROLE_ keys with equivalent on-prem group  (displayName)  
  
# invited users: Entra ID change guest to Microsoft Fabric (free) then optionally: after they access site once, change back to guest  
  
PortalCalendar uses 1 SharePoint calendar (and it reads from outlook calendar as well)  
****to add an entire SharePoint calendar to outlook: Site Contents ->  Events -> Calendar (top ribbon bar)****  
![Connect to Office or Connect to](Attachments/A1BEA429-2E40-4A57-85BF-1C1179BB9DE6.tiff)  
troubleshoot  
... you may want additional calendars so the user can choose which to subscribe to.  e.g.: 1 per department, + an Assignments calendar, etc.  
  
  
  
# Azure Functions  
* app registration azure_functions: make app role lopsecretary api ✅  
* *enterprise app* azure_functions: assign ComplianceOfficer, IT, CSLA Dev Project to app role ❌  
![Home azure functions | Users and groups](Attachments/81F1C09E-32EC-4473-BDDE-DAB6F050B1F7.tiff)  
## Can anyone call my Azure Function as many times as they’d like?  
**Yes, any caller who can successfully authenticate to the Function can call it as often as they want unless you add throttling/controls.** “Authenticated” only gates *who*, not *how often*.  
In your repo, the Procedure Checklist import endpoints are **HTTP-trigger functions with authLevel: "anonymous"**:  
function.json  
Lines 1-17  
```
{
	"scriptFile": "__init__.py",
	"bindings": [
		{
			"authLevel": "anonymous",
			"type": "httpTrigger",
			"direction": "in",
			"name": "req",
			"methods": ["post"]
		},
		{
			"type": "http",
			"direction": "out",
			"name": "$return"
		}
	]
}

```
…and the function code enforces **only “Bearer token present and validates (iss/aud)”**, not rate limits:  
lop_procedure_checklist_import.py  
Lines 41-58  
```
def main(req: func.HttpRequest) -> func.HttpResponse:
    ...
    auth = req.headers.get("Authorization") or ""
    if not auth.lower().startswith("bearer "):
        return _json({"error": "Missing Authorization: Bearer token"}, status=401)
    token = auth.split(" ", 1)[1].strip()
    tenant_id = os.getenv("AZURE_TENANT_ID") or ""
    api_app_id = os.getenv("FUNCTION_API_APP_ID") or ""
    ...
    try:
        claims = decode_and_validate_access_token(token, tenant_id=tenant_id, api_app_id=api_app_id)
        caller_email_from_claims(claims)
    except Exception as e:
        return _json({"error": f"Unauthorized: {e}"}, status=401)

```
  
So today, **abuse prevention is up to you** (platform + code). Practical options:  
    * **Put the Function behind API Management (APIM)** and add:  
    * per-user / per-IP / per-client rate limits  
    * quotas (e.g., 50 imports/day/user)  
    * request size limits, JWT validation, and logging  
    * **Add app-side throttling**:  
    * maintain per-user counters in storage (Table/Cosmos/Redis) with rolling windows  
    * return 429 on excess  
    * **Make the operation asynchronous**:  
    * accept the upload, enqueue a job, immediately return 202 + job id  
    * enforce “one running import per user” (idempotency/locking)  
* **Limit who can even obtain a token** (see next section): if fewer people can call it, fewer can spam it.  
## Can anyone run the Procedure Checklist “import” even though it’s meant for COMPLIANCEOFFICER + IT editors?  
**As implemented: yes — any user who can get a token for your Function API can run it.** There is currently **no role/group authorization check** in LopProcedureChecklistImport / ...ImportStart; they only validate the token.  
Your SPFx client calls these endpoints using AadHttpClient (or a raw XHR with Bearer token), meaning **any user who can load the web part and acquire a token can attempt the import**:  
ProcedureChecklistIngestApi.ts  
Lines 134-147  
```
const url =
  payload && payload["_fastStart"] === true
    ? `${base}/api/LopProcedureChecklistImportStart`
    : `${base}/api/LopProcedureChecklistImport`;
...
xhr.setRequestHeader("Authorization", `Bearer ${token}`);

```
Also, your token validation helper (entra_jwt.py) checks **issuer + audience**, but **does not check roles/groups/scopes**:  
entra_jwt.py  
Lines 46-72  
```
payload = jwt.decode(..., options={"verify_aud": False, "verify_iss": False})
...
if not _issuer_ok(iss, tenant_id=tenant_id): raise ValueError("Invalid token issuer")
if not _audience_is_allowed(payload.get("aud"), api_app_id=api_app_id): raise ValueError("Invalid token audience")
return payload

```
  
**What to do (recommended patterns)**  
    * **Enforce authorization in the Function (server-side) based on claims**:  
    * **App roles**: define app roles like ProcedureChecklist.Import in the Entra app registration; assign to COMPLIANCEOFFICER + IT editors; then check the token’s roles claim in Python before proceeding.  
    * **Groups**: assign users to an Entra security group; configure the app to emit groups claims (or use Graph “checkMemberGroups”); then check membership in code.  
    * **Tighten EasyAuth / Function App Authentication settings**:  
    * In your docs you note you can pick “any signed-in tenant user” vs “specific users/groups”. If you keep it as “any signed-in tenant user”, then your Function is available to basically everyone in the tenant who can obtain a token.  
    * Prefer **specific users/groups** (or **only specific client applications**) *plus* server-side checks.  
    * **Don’t rely on SPFx UI role gating alone**:  
    * Hiding the import button for non-editors helps UX, but it’s not security—anyone can still call the endpoint directly if they can authenticate.  
## Where these endpoints are referenced in the project  
    * **Procedure checklist import**: src/api/ProcedureChecklist/ProcedureChecklistIngestApi.ts calls:  
    * POST /api/LopProcedureChecklistImport  
    * POST /api/LopProcedureChecklistImportStart  
    * **Other Azure Function usage (same base/app id pattern)**:  
    * src/webparts/portalAssignments/services/AssignmentsMutationsApi.ts → POST /api/PortalAssignmentsMutate  
If you want, I can outline a concrete “best fit” approach for your exact roles (COMPLIANCEOFFICER + IT editors) using **either App Roles** or **Group claims**, and show exactly what claim to check based on your current token acquisition path.  
