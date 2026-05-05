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

**note:** ask for `config/.env.dev` as needed.

- **EasyAuth / incoming auth**: the Function App’s identity provider app registration is for validating who called the function (delegated token from SPFx / `AadHttpClient`).
- **App-only Graph work** (what the function does after validating the caller) uses the daemon credentials loaded by `azure_function.sbpubdef.local_upload.authenticate()`.

If you keep the repo’s common “single daemon app” model, put these on **sbpubdef-provisioning** (Microsoft Graph **application** permissions + admin consent):\n\n- `Sites.Selected` (plus the one-time site permission grant)\n- `Mail.Send` (for `scripts/py/test_email.py`)\n- `Calendars.ReadWrite` (for `create_assignment_calendar_event.py`)\n- `User.Read.All` only if you need user object id lookup\n\nSee: `scripts/py/migration/target_app_registration.md`.
