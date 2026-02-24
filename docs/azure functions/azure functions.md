# azure functions

0. make azure free account (1million free azure function runs), i tried updating to 'pay as you go' subscription because the function would 401 if i didn't restart it often.  
   1, ~~choose consumption function~~ (flex consumption recommended if needed faster execution, but more $$$)  
   ![Project Details](Attachments/AFDEF7BB-87F2-407D-8AE4-3B4364B84F1C.jpg)
1. use continuous deployment and modify AZURE_FUNCTIONAPP_PACKAGE_PATH to 'scripts/py/sbpubdef/azure_function' (in .github/ workflow file (github action))

details/summary:  
![Details](Attachments/5C9F14B8-A2E4-404C-AA1D-69432E8B1B3F.jpg)  
![Azure OpenAl](Attachments/99C3C49E-0F9A-4FE0-AEAE-A6E1D3353D70.jpg)  
i had to try West US 3 (it gave error about quotas with 'West US').  
![8. Microsoft.Web-FunctionApp-Portal-0181beba-a/cf | Overview](Attachments/54EA37E2-E20C-49EC-A989-A83CAC7731A6.jpg)  
you've created 'Function App' (holding many azure function)

install azure function core tools (for local dev):  
[https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=macos%2Cisolated-process%2Cnode-v4%2Cpython-v2%2Chttp-trigger%2Ccontainer-apps&pivots=programming-language-python](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=macos%2Cisolated-process%2Cnode-v4%2Cpython-v2%2Chttp-trigger%2Ccontainer-apps&pivots=programming-language-python)

cd into AZURE_FUNCTIONAPP_PACKAGE_PATH:

```
echo '{"version": "2.0"}' >> host.json

# and ensure azure function folder has function.json

kill -9 $(lsof -t -i:7071) && func start --verbose # restart dev server

# test
curl -i -X POST http://localhost:7071/api/SendEmail \
  -H "Content-Type: application/json" \
  -d '{"to_email":"sgonzales@csproject25.onmicrosoft.com","subject":"hello?","body":"my body"}'

```

# create mailbox to send from on behalf of the organization/app registration

you can also choose any user email: e.g. [sgonzales@csproject25.onmicrosoft.com](mailto:sgonzales@csproject25.onmicrosoft.com)  
... but we'll make one (Create a dedicated “service account” mailbox)

```
sbpubdef@csproject25.onmicrosoft.com

```

In Microsoft 365 admin center:

- **++Users → Active users → Add a user++** (for a user mailbox/service account)
- **~~Teams & groups → Shared mailboxes → Add a shared mailbox~~**

~~The tenant may restrict app-only mail with an **Application Access Policy** (Exchange Online). If so, you must whitelist the mailbox (or a group of mailboxes) the app is allowed to send as. This is common in locked-down tenants.~~

**++options:++** shared mailbox vs “service account” mailbox (recommended for apps)~~, or send as existing user~~  
Why **shared mailbox** is better: **No license** required (usually, under 50GB)

In Microsoft 365 admin center:

- **~~Users → Active users → Add a user~~**~~ (for a user mailbox/service account) or~~
- **++Teams & groups → Shared mailboxes → Add a shared mailbox++**

[sbpubdef@csproject25.sharepoint.com](mailto:sbpubdef@csproject25.sharepoint.com)

# set environment variables from .env.public.dev / .env.dev @ azure portal -> Function App -> Settings -> Environment Variables

```
￼

```

# build fails

```
working-directory: scripts/py/azure_function

```

(see current workflow .yaml)

# now if build succeeds and deploy fails do this:

missing environment variable: **AzureWebJobsStorage** **Value:** _(storage connection string)_  
You can get the connection string from: **Storage account → Security + networking -> Access keys → Connection string**  
(If you don’t already have a storage account, create one first.)  
![Create a storage account](Attachments/E819FB7F-8367-4161-8862-4BD2AD60D12C.jpg)

# fix packages not included in build .zip (module not found error)

replace pip install in workflow .yaml _build_ job:

```
pip install --target="./.python_packages/lib/site-packages" -r requirements.txt

```

or try: cd scripts/py/azure_function && func azure functionapp publish SendEmail --build remote

## 3️⃣ Important: CORS

Before SPFx can call it from the browser, you must configure CORS.  
Go to: Azure Portal → Function App → API -> **CORS,** and add:

```
https://csproject25.sharepoint.com
https://localhost:4321

```

Otherwise the browser will block the call even if the function works.

# new function: SendEmail

### scripts/py/azure_function/SendEmail/**init**.py

```
import json
import logging
import azure.functions as func

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info("HTTP trigger function processed a request.")
    return func.HttpResponse(json.dumps({"success": True}), mimetype="application/json")

```

### scripts/py/azure_function/SendEmail/function.json

```
{
	"scriptFile": "__init__.py",
	"bindings": [
		{
			"authLevel": "function",
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

requires app registration w/ admin consent for Mail.send

add to script/spy/requirements.txt: ~~sendgrid~~  
 azure-functions

# using function's

go to function app -> function ->  
![@ Get function URL](Attachments/73236A5C-4BC3-4E57-AAB1-E2873C8F1C7B.jpg)  
![Get Function URL](Attachments/A4E3CF85-D1E6-43CF-85AF-AF8D5E8FF097.jpg)  
choose (Function key), add to add to config/.env.public

### send an email works!

```
curl -i -X POST "https://sbpubdef-agfwa0d9e3b9anch.westus3-01.azurewebsites.net/api/SendEmail?code=<function key>" \
  -H "Content-Type: application/json" \
  -d '{"to_email":"sgonzales@csproject25.onmicrosoft.com","subject":"test (subject)","body":"test (body)"}'

```

note: if u can't see the invocation or see HTTP 401 Unauthorized try restarting the Function App

# using authentication

note: we probably shouldn't expose Function key to spfx... use easyauth?
