# azure function.md
# scripts/py/azure_function/SendEmail/__init__.py
add to script/spy/requirements.txt:       sendgrid  
azure-functions

made azure free account (1million free azure function runs)  
choose consumption function (flex consumption recommended if needed faster execution, but more $$$)  
![see pie be you ecle your code haeroes entere eat tale to tat a co](Attachments/DCE127BF-E642-47C8-8BBC-772187D382CE.tiff)

use continuous deployment and modify AZURE_FUNCTIONAPP_PACKAGE_PATH to 'scripts/py/sbpubdef/azure_function' (in .github/ workflow file (github action))  
![sSpubdef3416](Attachments/95A0CE81-33D6-449D-8F8C-30625C30DFA1.tiff)  
details/summary:  
![Subscription](Attachments/31D09BB0-371F-49E5-8ADA-064C4449AC60.tiff)  
![Authentication](Attachments/59BC464C-FE06-4385-8217-B7306C5DCD54.tiff)  
i had to try West US 3 (it gave error about quotas with 'West US').  any of the above related to that is stale.
```
-g9bwbshdgdaqhnaa.westus3-01.azurewebsites.net

```
![Pasted Graphic 4.tiff](Attachments/3DD73A4C-A361-426A-97FF-07CBF8C72421.tiff)  
install azure function core tools (for local dev):  
[https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=macos%2Cisolated-process%2Cnode-v4%2Cpython-v2%2Chttp-trigger%2Ccontainer-apps&pivots=programming-language-python](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=macos%2Cisolated-process%2Cnode-v4%2Cpython-v2%2Chttp-trigger%2Ccontainer-apps&pivots=programming-language-python)

mac:
```
brew tap azure/functions
brew install azure-functions-core-tools@4
# if upgrading on a machine that has 2.x or 3.x installed:
brew link --overwrite azure-functions-core-tools@4

```

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


...apparently i created 'Function App' (holding many azure function): **SendEmail** (we will change this to sbpubdef?)  
change main_sendemail.yml to sbupubdef.yml & replace *SendEmail* occurences


# create mailbox to send from on behalf of the organization/app registration
you can also choose any user email: e.g.  [sgonzales@csproject25.onmicrosoft.com](mailto:sgonzales@csproject25.onmicrosoft.com)  
... but we'll make one (Create a dedicated “service account” mailbox)
```
sbpubdef@csproject25.onmicrosoft.com

```
In Microsoft 365 admin center:
* **++Users → Active users → Add a user++** (for a user mailbox/service account)
* **~~Teams & groups → Shared mailboxes → Add a shared mailbox~~**

~~The tenant may restrict app-only mail with an **Application Access Policy** (Exchange Online). If so, you must whitelist the mailbox (or a group of mailboxes) the app is allowed to send as. This is common in locked-down tenants.~~

**++options:++**  shared mailbox vs “service account” mailbox (recommended for apps)~~, or send as existing user~~  
Why **shared mailbox** is better: **No license** required (usually, under 50GB)

In Microsoft 365 admin center:
* **~~Users → Active users → Add a user~~**~~ (for a user mailbox/service account) or~~
* **++Teams & groups → Shared mailboxes → Add a shared mailbox++**

[sbpubdef@csproject25.sharepoint.com](mailto:sbpubdef@csproject25.sharepoint.com)  

&nbsp;

set environment variables from .env.public.dev / .env.dev @ azure portal -> Function App -> Settings -> Environment Variables
```
AZURE_FUNCTIONS_ENVIRONMENT=YES

TENANT_NAME="csproject25"
FUNCTION_BASE_URL="-g9bwbshdgdaqhnaa.westus3-01.azurewebsites.net"
# from EntraID App Registration ('pnp')
AZURE_TENANT_ID=""
AZURE_CLIENT_ID=""
AZURE_CLIENT_SECRET=""
```