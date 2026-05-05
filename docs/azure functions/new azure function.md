# docs/new azure function.md

### one azure function:
```
scripts/py/azure_function/SendEmail/__init__.py
scripts/py/azure_function/SendEmail/function.json
```

&nbsp;
### install — develop functions locally: [install azure function core tools](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=macos%2Cisolated-process%2Cnode-v4%2Cpython-v2%2Chttp-trigger%2Ccontainer-apps&pivots=programming-language-python)
- `cd scripts/py/azure_function`
- `func start`
- restart snippet: ```kill -9 $(lsof -t -i:7071) && func start --verbose```

&nbsp;

say you create: `scripts/py/azure_function/SendEmail` it's available at:

```
curl -i -X POST http://localhost:7071/api/SendEmail \
  -H "Content-Type: application/json" \
  -d '{"to_email": "sgonzales@csproject25.onmicrosoft.com", "subject": "test subj", "body": "test body"}'
```

automatically deploys via git push to https://sbpubdef-agfwa0d9e3b9anch.westus3-01.azurewebsites.net/api/SendEmail


&nbsp;

it's only available to authenticated entra users via spfx webpart (AadHttpClient)

configured @ Function App -> Authentication -> **Identity provider** (azure_functions app registration)



&nbsp;

&nbsp;

**note:** ask for `config/.env.dev` as needed. **Microsoft Graph** permissions such as `Mail.Send` and `Calendars.ReadWrite` belong on the **Function app / EasyAuth** (or dedicated API) registration that backs `AadHttpClient`, not on **sbpubdef-provisioning** (tenant migration automation; prefer Graph application **`Sites.Selected`** and site-scoped grants — see `scripts/py/migration/target_app_registration.md`).
