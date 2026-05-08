# PD Intranet migration runbook

> **Supporting reference (tooling):** `scripts/py/migration/README.md`  
> **Azure Functions deep docs:** `docs/azure functions/` and `docs/azure_functions/azure_functions.md` + `docs/azure functions/securing azure functions.md`.

---

## 1. Purpose and assumptions

This runbook is for migrating the **PD Intranet** SharePoint communication site and the supporting SPFx + Azure Functions integration from a **source tenant** to a **target tenant**, using the repo’s migration tooling.
- for dev tenant recommended: **Microsoft 365 Business Premium** (required for *Role Groups* (unimplemented due to previous dev environment below premium))
-  Created a new **Communication Site** named `PD-Intranet`.
- [ ] (Optional) Register as Hub site (note: after solution install, `ThemeInjector` hides the hub nav bar)

---

## 2. Migration checklist

- You will use **two app registrations**:
    - **`sbpubdef-provisioning`**: app-only provisioning + migration scripts
    - **`sbpubdef-EasyAuth`**: Azure Functions EasyAuth / API auth (incoming auth)

**App registrations**

- [ ] Create/update `sbpubdef-provisioning` (Graph `Sites.Selected`, admin consent)
- [ ] Grant `sbpubdef-provisioning` access to target site (`Sites.Selected` site permission grant)
- [ ] Create/update `sbpubdef-EasyAuth` (Function API auth)
- [ ] Confirm `FUNCTION_API_APP_ID` matches EasyAuth/API app AND SPFx `package-solution.json` `webApiPermissionRequests`

**Env + packaging**

- [ ] Configure `.env.dev` (source export) and `.env.migration.target` (target import)
- [ ] Confirm `.env.public.dev` / `.env.public.prod` have correct `TENANT_NAME` and role keys
- [ ] Confirm `package-solution.json` web API permission requests match EasyAuth/API app

**Export/import**

- [ ] Run `run_full_export.py` against source
- [ ] Run `run_full_import.py` against target
- [ ] Mid-run: package + deploy SPFx `.sppkg`, approve API permissions

**SharePoint configuration**

- [ ] Ensure PD content types exist (PD Announcement / PD Events / PD Form List)
- [ ] Ensure `PDDepartment` site column exists and is on the right content types
- [ ] Configure Search managed property mapping for `PDDepartment`, reindex as needed

**Verification**

- [ ] Verify pages (created + published) and that `SitePages` was not imported as list items
- [ ] Verify permissions (site + lists + libraries)
- [ ] Verify Entra groups + users
- [ ] Smoke tests (SPFx web parts show content; Announcements returns items)

---

## 3. Target tenant/site setup

1. Create **Communication Site**: `PD-Intranet`
2. Site settings URL (target example):  
   `https://<tenant>.sharepoint.com/sites/PD-Intranet/_layouts/15/settings.aspx`
3. Optional: make it a **Hub site** (if you want the extra top bar of nav links / associations).  
   - Note from original doc: after installing solution, `ThemeInjector` hides it.

---

## 4. App registrations

### 4.1 `sbpubdef-provisioning` (migration / provisioning automation; least privilege)

1. Entra App registrations list:  
   `https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade/quickStartType~/null/sourceType/Microsoft_AAD_IAM`
2. **Certificates & secrets** → create a client secret; copy the value once.
3. **API permissions** → Microsoft Graph → **Application** → add **`Sites.Selected`**  
   → **Grant admin consent** (via Enterprise Apps / admin consent flow).
4. **`Sites.Selected` site grant (required)** — `Sites.Selected` does nothing until you explicitly grant the app access to the site.
   - Get the site collection id (comma-separated form) from:  
     `GET https://graph.microsoft.com/v1.0/sites/<tenant>.sharepoint.com:/sites/PD-Intranet`
   - Grant the app permission on the site (Graph Explorer or another tool with elevated permissions like `Sites.ReadWrite.All` / `Sites.Manage.All` / `Sites.FullControl.All`):

```http
POST https://graph.microsoft.com/v1.0/sites/{siteCollectionId}/permissions
```

With JSON that grants the **`sbpubdef-provisioning`** application (client) id role **`manage`**.

> Screenshots: `img0.png`, `img_1.png` (same folder as this doc).

---

### 4.2 `sbpubdef-EasyAuth` (Azure Functions incoming auth / API app)

- Azure Functions authentication / API app registration used for **incoming** auth (EasyAuth / `AadHttpClient`).
- **Separate** from the daemon/app-only provisioning app.

**Critical alignment gotcha:**

- `FUNCTION_API_APP_ID` must match:
  - the EasyAuth/API app registration **client id**, and
  - `package-solution.json` → `webApiPermissionRequests` → `"resource": "<FUNCTION_API_APP_ID>"`

> Screenshot (Entra plan limitation): `Attachments/81F1C09E-32EC-4473-BDDE-DAB6F050B1F7.tiff`

---

### 4.3 API permissions / admin consent (summary)

Keep app-only Graph permissions on **`sbpubdef-provisioning`** so local scripts + functions share credentials:

- `Sites.Selected` (application) + explicit site permission grant (**required**)
- `Mail.Send` (application)
- `Calendars.ReadWrite` (application) for creating events in staff mailboxes (PortalCalendar, Assignments, …)
- `User.Read.All` (application) only if you need Entra user object-id lookup (`graph_get_user_object_id`)

More detail: `scripts/py/migration/target_app_registration.md`

---

## 5. Env files

### 5.1 `.env.dev` (source export)

Used by export tooling (`run_full_export.py`).

- Set `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`
- In the public env file, update `TENANT_NAME` for the **source** tenant

### 5.2 `.env.migration.target` (target import)

Used by import tooling (`run_full_import.py`). Start from `config/.env.migration.target.example` → `config/.env.migration.target`.

Sample:

```bash
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
TENANT_NAME=mycsproject25
MIGRATION_TARGET_SITE_NAME=PD-Intranet
MIGRATION_EXPORT_DIR=scripts/py/migration/.migration_output
MIGRATION_DRY_RUN=false
MIGRATION_SPFX_DEPLOYED=true
```

**Gotcha:** Set `MIGRATION_SPFX_DEPLOYED=true` **only after** the SPFx `.sppkg` is actually deployed.

### 5.3 `.env.public.dev` / `.env.public.prod`

- Ensure `TENANT_NAME` matches the environment.
- Ensure role keys (e.g. `ROLE_...`) align with recreated Entra Security Groups.

### 5.4 `package-solution.json`

- `webApiPermissionRequests` must use the EasyAuth/API app registration **Application (client) ID** + scope name.

---

## 6. Export/import scripts

### 6.1 Source export

From repo root:

```bash
PYTHONPATH=scripts/py python3 scripts/py/migration/run_full_export.py
```

(or `uv run` equivalent if your workflow uses it)

Outputs to `.migration_output` by default: content types, columns, site pages, lists, document libraries.

### 6.2 Target import

After the target site exists and the `Sites.Selected` site grant succeeds:

```bash
PYTHONPATH=scripts/py python3 scripts/py/migration/run_full_import.py
```

**Mid-run manual stop (expected):** build + upload SPFx `.sppkg` to the **target** app catalog (`pnpm run make`, then SharePoint admin → approve requested API permissions).

### 6.3 Rerun flags

```bash
PYTHONPATH=scripts/py python3 scripts/py/migration/run_full_import.py --skip-library-uploads
```

Use when rerunning and you want to avoid re-uploading library files.

Other useful env flags (see `scripts/py/migration/README.md`): `MIGRATION_LIST_ALLOWLIST`, `MIGRATION_DRY_RUN`, `MIGRATION_SKIP_CANVAS_PATCH`, etc.

### 6.4 Expected reports

- `scripts/py/migration/.migration_output/import_reports/import_content_types.json`
- `scripts/py/migration/.migration_output/reports/page_import_summary.json`
- `scripts/py/migration/.migration_output/reports/page_promote_news_results.json`
- Per-page: `scripts/py/migration/.migration_output/import_reports/page_reconstruction/*.md`

**Gotcha:** `SitePages` should **not** be imported as normal list items; modern pages are handled by `provision_pages.py` / related steps.

---

## 7. SPFx package deployment

1. Build/package: `pnpm run make`
2. Upload `.sppkg` to the **target** tenant app catalog.
3. Approve pending API permissions: `https://admin-<tenant>.sharepoint.com` → Advanced → API access.

**Gotcha:** If `access_as_entra_user` fails with “The requested permission isn't valid…”, align SPFx `package-solution.json` with `FUNCTION_API_APP_ID` (EasyAuth/API app).

Reupload/reapprove as needed after fixes.

---

## 8. SharePoint configuration

### 8.1 Content types

- **PD Announcement** (under Site Page / document content types as appropriate)
- **PD Events**
- **PD Form List**

Automation: `import_content_types.py` targets these from export. Manual fallback URL:

`https://<tenant>.sharepoint.com/sites/PD-Intranet/_layouts/15/ctypenew.aspx`

### 8.2 `PDDepartment` site column

Add as site column (Choice with ROLE_ keys: EVERYONE, PDINTRANET, IT, HR, …) and link to content types that need it.

### 8.3 Site Pages content types

Enable **PD Announcement** on the Site Pages library if the UI does not show it (Library Settings → content types).

### 8.4 Managed search property + reindexing

Announcements web part uses hub search; results depend on **`PDDepartment`** as a managed property.

Tenant search admin:

`https://<tenant>-admin.sharepoint.com/_layouts/15/searchadmin/ta_listmanagedproperties.aspx?level=tenant`

Example mapping (source tenant reference):

- **Managed property:** `PDDepartment` (Text; Query, Search, Retrieve; allow multiple values; Safe)
- **Alias / crawled property mapping:** `ows_q_CHCS_PDDepartment` → `PDDepartment`

**Crawled properties (after crawl):**

- `ows_PD_x0020_Department` may exist unmapped
- `ows_q_CHCS_PDDepartment` → map to managed property `PDDepartment`

**Reindex:** Site Settings → reindex site; and **Site Pages** library → Library Settings → Advanced settings → **Reindex Document Library** (often needed before `ows_q_CHCS_PDDepartment` appears).

---

## 9. Azure Functions handoff

**Primary docs (do not duplicate here):**

- `docs/azure_functions/azure_functions.md`
- `docs/azure functions/securing azure functions.md`

**Values that must align across SPFx, Functions, and env:**

- `FUNCTION_API_APP_ID` = EasyAuth/API app client id = `package-solution.json` `webApiPermissionRequests` resource.

**Helper:** `python3 patch_azure_function_environment.py azure_function_environment.json` to patch exported Function env from env files.

---

## 10. Entra groups and users

Recreate **Security Groups** (examples from original export; update IDs in your tenant):

| displayName      | id (example — replace in target)     |
| ---------------- | ------------------------------------ |
| Attorney         | f9e66388-efe6-4b94-811c-a0890a51ea73 |
| CDD              | f16e8da5-04df-4d3e-93f2-400752a4ab14 |
| ComplianceOfficer| f7262977-8900-4b64-99e1-378db87fcf35 |
| HR               | 26a2d26f-8019-4285-b682-90e491d77049 |
| IT               | bb27ef32-d7fe-4ed5-81b8-b6237098d6aa |
| LOP              | cc440ce9-6b0d-4ee0-bc18-1e8f65d498f9 |
| PDIntranet       | 1a4bac58-bfe9-4ca5-9ed5-50b5d77c572c |
| TrialSupervisor  | 8d69c597-971c-4c64-b7cb-a8078ab78d9f |

- Export CSV from source Entra if needed; recreate in target or map `ROLE_` keys in `.env.public.*` to on-prem equivalents if applicable.

**Site access screenshot:** `Attachments/Untitled.jpg`

**Invited users:** Entra ID → change guest to **Microsoft Fabric (free)**; optionally after first site access, change back to guest.

---

## 11. Site/list/library permissions verification

- Site membership and default groups
- Lists/libraries with unique permissions
- Role-based access vs Entra groups

**Placeholder — add later:** screenshots of individual list permissions.

---

## 12. Navigation and calendar notes

### Navigation (“header links”)

- Example: audience targeting / “view as” links — `Attachments/a.jpg`
- App-only SharePoint REST for navigation may be blocked in some tenants; use delegated tooling (e.g. PnP PowerShell) if `export_navigation.py` returns empty.

### Calendar / Outlook

**Connect SharePoint calendar to Outlook:** Site Contents → **Events** → **Calendar** (ribbon).

**Screenshot (Connect to Outlook buttons missing):** `Attachments/A1BEA429-2E40-4A57-85BF-1C1179BB9DE6.tiff`

You may want multiple calendars (e.g. per department + Assignments).

---

## 13. Smoke test checklist

- [ ] PD Announcement pages exist, published, correct content type + `PDDepartment`
- [ ] Announcements web part returns items (search MP + reindex + news promotion if needed)
- [ ] Key lists: schema + items
- [ ] Document libraries: files present
- [ ] SPFx deployed; API permissions approved; no `access_as_entra_user` mismatch
- [ ] Azure Functions + EasyAuth paths work end-to-end

---

## 14. Known gotchas

- **`SitePages`** — do not treat as normal list-item import; use page provisioning scripts.
- **Pages** — creation/publishing may need a UI check; see `page_import_summary.json` and per-page `.md` reports.
- **`MIGRATION_SPFX_DEPLOYED=true`** — only after `.sppkg` is deployed.
- **`Sites.Selected`** — requires explicit **site** permission grant or Graph calls to the site will fail.
- **`FUNCTION_API_APP_ID`** — must match EasyAuth/API app and `package-solution.json` `webApiPermissionRequests`.
- **Search `PDDepartment`** — crawl/reindex delay before Announcements hub search works.
- **Placeholder:** add per-list permission screenshots when available.

**Screenshot index**

| File | Meaning |
| ---- | ------- |
| `Attachments/Untitled.jpg` | Site Access |
| `Attachments/A1BEA429-2E40-4A57-85BF-1C1179BB9DE6.tiff` | Connect to Outlook buttons missing |
| `Attachments/a.jpg` | Navigation / audience targeting / view-as example |
| `Attachments/81F1C09E-32EC-4473-BDDE-DAB6F050B1F7.tiff` | Entra “Groups are not available for assignment due to your Active Directory plan level…” |
| `img0.png`, `img_1.png` | App registration / site permission grant (original doc) |

---

## 15. Appendices

### Appendix A — M365 / Entra plan note

Business Premium called out for **feature-complete Entra** for role groups + Functions; see `docs/azure functions/securing azure functions.md`.

### Appendix B — Migration tooling reference

`scripts/py/migration/README.md` — full step list, env vars, reports, troubleshooting.

### Appendix C — Production vs dev env (original note)

- `scripts/py/azure_function` — set `AZURE_FUNCTIONS_ENVIRONMENT` so Functions use production behavior where applicable.
- `scripts/js` (gen-env) — ensure `process.env.NODE_ENV === "production"` for production builds.

### Appendix D — serve.json / write-manifests.json

Ensure URLs use the correct **`TENANT_NAME`** for the environment you are targeting.

### Appendix E — Optional Teams group

Active teams and groups: `https://admin.cloud.microsoft/?trysignin=0#/groups` — optional “CSLA Dev Project” style group.
