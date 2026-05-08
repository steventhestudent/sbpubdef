# Project transfer and environment migration (SPFx / SharePoint Online)

This document consolidates **original transfer notes** (see `transfer of work.md`) with the **automated export/import tooling** under `scripts/py/migration/`.

Legend:

| Tag | Meaning |
|-----|---------|
| **(fact—repo)** | Stated in committed files in this repository |
| **(fact—export)** | Observable in local migration export JSON under `scripts/py/migration/.migration_output/` when present |
| **(inference)** | Derived from code paths or docs, not a guaranteed tenant state |
| **(assumption)** | Project context or typical deployment; verify in your environment |
| **(unknown)** | Requires manual verification |

---

## 1. Executive Summary

**(assumption)** The current SharePoint Online **development** tenant will be decommissioned. This repo powers an SPFx intranet solution (**sbpubdef-sol**) deployed to a **communication-style site** (historically **PD-Intranet** / path **`PD-Intranet`**).

**Goals:**

1. **Preserve data and configuration** from the source site via Python export scripts (Graph-first).
2. **Rebuild** the target site using import/provision scripts plus **manual** steps where automation is unsafe (content types, full permissions, page canvas POST, etc.).
3. **Redeploy** the `.spkg` to the **target** tenant app catalog and align **environment variables** (list titles, internal columns, hub name, Azure Function URLs, Entra group mapping).
4. **Not** treat migration as a blind restore: transform tenant-specific IDs, URLs, and group IDs.

**Likely failure points (surface early):**

| Risk | Why |
|------|-----|
| **Lookup / person fields** on list items | Old tenant IDs do not resolve on the target. |
| **Non-text columns** | Import only auto-creates **text** columns; choice/lookup/person need UI or extended scripts. |
| **SharePoint REST 401** with app-only | Export/import often rely on **Microsoft Graph**; classic `_api` may reject app-only tokens. |
| **Page JSON** | Exported page metadata is **reconstruction reference**, not something to POST back verbatim. |
| **Permissions** | List/item unique permissions may be **incomplete** in export; must be re-verified manually. |
| **Legacy source column typo (`Statuc`)** | Old source tenant exported a typo internal name **`Statuc`** (display may have been “Status”). Rebuilt target intentionally corrects this to internal name **`Status`**. Import transforms read `Statuc` from old exports and write `Status` to target. |

---

## 2. Project Inventory

### 2.1 Solution and package **(fact—repo)**

| Item | Value / location |
|------|------------------|
| SPFx solution name | `sbpubdef-sol-client-side-solution` (`config/package-solution.json`) |
| Solution GUID | `83f74721-7ec5-417d-8255-f7d2fdc95d65` |
| Packaged file | `sharepoint/solution/sbpubdef-sol.sppkg` (after `pnpm run make` per `docs/make and upload solution.md`) |
| Current declared version | `1.0.0.3` (`config/package-solution.json`) — **bump when releasing** |

### 2.2 Source material cross-links **(fact—repo)**

| Area | Document / path |
|------|------------------|
| Original transfer checklist | `docs/transfer of work/transfer of work.md` |
| Build & upload | `docs/make and upload solution.md`, repo `README.md` |
| Azure Functions | `docs/azure functions/azure functions.md`, `docs/azure functions/securing azure functions.md` |
| Migration tooling | `scripts/py/migration/README.md`, `scripts/py/migration/target_app_registration.md` |
| Store / review metadata | `docs/sharepoint-store/` |

### 2.3 Scope snapshot **(assumption—project context)**

| Dimension | Stated scope |
|-----------|----------------|
| Site collections | 1 (root of migration) |
| Site pages (modern) | ~3 **(assumption)** |
| Lists (business) | ~11 **(assumption)** — **verify** against `lists/index.json` in export |
| Document libraries | A couple **(assumption)** — export `libraries/_manifest.json` is authoritative |

The export index **(fact—export, when present)** may list **more** entries (system/hidden lists). Scripts can skip many via `MIGRATION_SKIP_SYSTEM_LISTS` / blocklist.

---

## 3. Environment Files and Configuration Strategy

### 3.1 What exists in the repo **(fact—repo)**

| File | Role |
|------|------|
| `config/.env.example` | Azure app placeholders (`AZURE_TENANT_ID`, etc.) |
| `config/.env.public` | Shared public defaults |
| `config/.env.public.dev` | **Dev tenant**-oriented public vars: `TENANT_NAME`, `HUB_NAME`, `LIST_*`, `INTERNALCOLUMN_*`, role slugs, `FUNCTION_BASE_URL`, `FUNCTION_API_APP_ID`, `HUB_SITEID`, etc. |
| `config/.env.public.prod` | **Production** tenant name placeholder (`TENANT_NAME="sbcounty"`) and empty `FUNCTION_BASE_URL` (extend per prod deployment) |
| `config/package-solution.json` | Solution metadata, `webApiPermissionRequests`, version |
| `config/.env.migration.target.example` | Template for **target-only** migration import |

**Gitignored (typical):** `config/.env.dev`, `config/.env.migration.target`, and other `*/.env.*` per `.gitignore` exceptions.

### 3.2 Recommended logical roles (map to actual filenames)

You asked for `.env.dev` / `.env.prod` / `.env.migration.target`. **This repo’s committed pattern** uses **`.env.public.dev`** and **`.env.public.prod`** for tenant-scoped **non-secret** variables consumed by SPFx build (`gen-env`). Secrets often live in a **private** `config/.env.dev` layer (not committed).

| Logical role | Recommended mapping in this repo |
|----------------|-----------------------------------|
| **Current / source dev tenant** | `config/.env.public.dev` + private `config/.env.dev` if used for secrets (`AZURE_*`, etc.) |
| **Production / runtime** | `config/.env.public.prod` + production secrets store — **do not overwrite for migration rehearsal** |
| **New target tenant (migration import)** | **`config/.env.migration.target`** (copy from `config/.env.migration.target.example`) — **only** for Python import scripts |

**Do not** edit production env files to test migration; use **`.env.migration.target`** and a **separate** app registration or consent in the **target** tenant.

### 3.3 SPFx env generation **(inference)**

Front-end code reads **`ENV.*`** (generated from public + private env). After changing list names or internal columns for the **target** site, regenerate env per existing project workflow (`scripts/js` / `gen-env` mentioned in `transfer of work.md`).

---

## 4. Source Tenant Export Process

### 4.1 Prerequisites **(fact—repo)**

- Python 3.10+ with `requests`, `msal`, `python-dotenv`.
- Azure AD app with **application** permissions (minimum **Microsoft Graph** `Sites.Read.All`; optional SharePoint resource token via `TENANT_NAME` for REST-based export paths).
- Env vars for **source** site: see `scripts/py/migration/README.md` — typically `AZURE_*`, `TENANT_NAME`, `MIGRATION_SITE_NAME` or **`HUB_NAME`**.

### 4.2 Commands **(fact—repo)**

```bash
PYTHONPATH=scripts/py python3 scripts/py/migration/run_full_export.py
```

Or individual `export_*.py` modules (same `PYTHONPATH`).

Default output root: **`scripts/py/migration/.migration_output`** (override with `MIGRATION_OUTPUT_DIR`).

### 4.3 Export scripts (what exists) **(fact—repo)**

| Script | Reads | Writes (under output root) |
|--------|--------|----------------------------|
| `export_site.py` | Graph site | `site/site.json` |
| `export_content_types.py` | Graph | `content_types/` |
| `export_lists.py` | Graph (+ REST views fallback) | `lists/index.json`, `lists/<name>_<id>/list.json`, `columns.json`, `views.json` |
| `export_list_items.py` | Graph | `list_items/*.jsonl` |
| `export_libraries.py` | Graph drives | `libraries/<drive>/files/`, `*.metadata.json`, `_manifest.json` |
| `export_pages.py` | Graph beta pages | `pages/*.json`, `index.json` |
| `export_permissions.py` | Graph + SharePoint REST | `permissions/` |

Shared: `sp_client.py`, `config.py`.

### 4.4 Export output structure **(fact—repo)**

See table in `scripts/py/migration/README.md` (“Output layout”). High level:

- **`lists/`** — schema and views per list.
- **`list_items/`** — one JSONL per list; fields use **internal** Graph keys.
- **`libraries/`** — binary files + sidecar metadata.
- **`pages/`** — page metadata / canvas when API allows.
- **`permissions/`** — best-effort; may be partial.

---

## 5. Target Tenant Import / Rebuild Process

### 5.1 Target env file **(fact—repo)**

Create **`config/.env.migration.target`** from **`config/.env.migration.target.example`** (gitignored).

Required variables **(fact—repo):**

| Variable | Purpose |
|----------|---------|
| `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` | App-only credentials (**target** tenant or multi-tenant app) |
| `TENANT_NAME` | **Target** SharePoint hostname prefix |
| `MIGRATION_TARGET_SITE_NAME` | Target site path (`/sites/{name}`) |
| `MIGRATION_EXPORT_DIR` | Path to **export bundle** (e.g. `scripts/py/migration/.migration_output`) |

Optional: `MIGRATION_DRY_RUN`, `MIGRATION_LIST_BLOCKLIST`, `MIGRATION_SKIP_SYSTEM_LISTS`.

### 5.2 Import scripts (what exists) **(fact—repo)**

| Script | Automation level |
|--------|------------------|
| `provision_site.py` | Verifies site reachable |
| `import_content_types.py` | **Manual** checklist |
| `import_site_columns.py` | **Manual** checklist |
| `import_lists.py` | Creates lists/libs from `lists/index.json`; writes `import_reports/list_name_to_new_id.json` |
| `import_list_columns.py` | **Text-only** columns via Graph |
| `import_list_views.py` | **Manual** checklist |
| `import_list_items.py` | Creates items from JSONL (skips document libraries) |
| `import_libraries.py` | Compares drive names to manifest |
| `upload_library_files.py` | Uploads files from `libraries/.../files/` |
| `provision_pages.py` | **Reports** per-page reconstruction Markdown |
| `apply_page_webparts.py` | **Remediation** lists for web parts |
| `validate_import.py` | Read-only validation vs export |
| `diagnose_permissions_migration.py` | **Manual** permissions checklist |

Orchestrator: **`run_full_import.py`** (inserts **manual SPFx deploy** step in console).

### 5.3 Import reads / writes **(fact—repo)**

- **Reads:** `MIGRATION_EXPORT_DIR` tree (`lists/`, `list_items/`, `libraries/`, `pages/`, …).
- **Writes:** `import_reports/` under that same export root (JSON + Markdown + `page_reconstruction/`).

### 5.4 Order **(fact—repo)**

Same numbered order as `scripts/py/migration/README.md` import section (provision → lists → columns → views checklist → items → libraries check → upload → **manual SPFx** → page reports → validate → permissions checklist).

---

## 6. Migration App Registration Setup

See **`scripts/py/migration/target_app_registration.md`** for detail **(fact—repo)**.

Summary:

| Need | Typical permission |
|------|-------------------|
| **Export (source)** | Graph `Sites.Read.All` (+ SharePoint app permission if REST needed) |
| **Import (target)** | Graph **`Sites.ReadWrite.All`** for creates/uploads **(inference—documented in target_app_registration.md)** |
| Admin consent | Required in **each** tenant where the app runs |

**Custom API / SPFx:** `config/package-solution.json` references **`c852c7d6-8c34-4b51-a368-92be5f2ac96a`** with scope **`access_as_entra_user`** **(fact—repo)** — aligned with `FUNCTION_API_APP_ID` in **`config/.env.public.dev`** **(fact—repo)**. Recreate or trust this registration in the **target** tenant when wiring Functions + SPFx `AadHttpClient`.

---

## 7. SharePoint Site Architecture

**(fact—repo)** `docs/transfer of work/transfer of work.md`: create a **Communication Site** (example name **PD Intranet**), URL segment **`PD-Intranet`** matches **`HUB_NAME`** in `config/.env.public.dev`.

**(fact—export)** Export JSON under `.migration_output` may contain full URLs with hostname **`csproject25.sharepoint.com`** — treat as **source** only; **do not** carry hostname into target config.

**(inference)** `src/utils/PNPWrapper.ts` and `src/api/ListApi.ts` use **`ENV.HUB_NAME`** for site resolution (`/sites/` + hub).

---

## 8. Lists, Libraries, Content Types, and Columns

### 8.1 List titles (public dev env) **(fact—repo)**

From **`config/.env.public.dev`**: e.g. `LIST_ASSIGNMENTS="Assignments"`, `LIST_ASSIGNMENTCATALOG="AssignmentCatalog"`, `LIST_EXPERTDIRECTORY="Expert Directory"`, `LIST_STAFFDIRECTORY="StaffDirectory"`, `LIST_PROCEDURECHECKLIST`, `LIST_PROCEDURESTEPS`, `LIST_HOTELINGRESERVATIONS`, `LIST_SITESETTINGS`, quiz lists, etc.

### 8.2 Assignments status column (canonical target schema)

**Canonical target schema (assumed):**

- List internal identity: `Assignments`
- Display name: `Assignments`
- Internal column name: `Status`
- Display name: `Status`

**Legacy source quirk (historical):**

- Old source tenant had an internal name typo: `Statuc` (display often “Status”).
- Rebuilt target intentionally corrects this to `Status`.
- Migration scripts should treat `Statuc` only as an **import-time transform** (read old exports, write `Status`), and should **fail** if `Statuc` exists on the target list.

### 8.3 Content types and site columns **(fact—repo)**

`config/.env.public.dev` defines content type **names** (`CONTENTTYPE_*`) and site column names (`SITECOLUMN_*`, `INTERNALCOLUMN_*`). Import scripts **do not** fully automate site content types — use export JSON + manual/PnP (`import_content_types.py`, `import_site_columns.py`).

---

## 9. Site Pages and Web Part Reconstruction

### 9.1 What export contains **(fact—repo)**

`export_pages.py` writes **`pages/*.json`** with metadata and, when the API allows, **`canvasLayout`** / layout strategies documented in `scripts/py/migration/README.md`.

### 9.2 Safe reconstruction process **(fact—repo + inference)**

1. **Do not** assume raw exported JSON can be **POST**ed to recreate pages.
2. Run **`provision_pages.py`** and **`apply_page_webparts.py`** to generate **Markdown/JSON remediation** under **`import_reports/`**.
3. **Deploy SPFx** to the target app catalog **first** so custom web parts exist.
4. Manually create or align modern pages in **Site Pages**, then add web parts to match the export / remediation report.
5. **Fallback:** use **`.aspx` / library export** under `libraries/.../SitePages/` if Graph page APIs are incomplete **(inference)**.

### 9.3 Likely failure points

| Issue | Mitigation |
|-------|------------|
| Canvas / SPFx web part **not** in target catalog | Deploy `.sppkg`; approve API permissions in admin |
| Graph canvas endpoints return **400** on some tenants | Rely on library files + manual layout |

---

## 10. SPFx Package Deployment

**(fact—repo)** `docs/make and upload solution.md`:

1. `pnpm run make` → `sharepoint/solution/sbpubdef-sol.sppkg`
2. Upload to tenant **App Catalog** (`https://<tenant>.sharepoint.com/sites/appcatalog/...`)

**Version:** bump `config/package-solution.json` `version` / feature versions when replacing an installed solution **(fact—repo)**.

**webApiPermissionRequests** **(fact—repo):** Microsoft Graph `Calendars.ReadWrite` + custom resource **`c852c7d6-8c34-4b51-a368-92be5f2ac96a`** / `access_as_entra_user`. Consent in **target** admin center after deploy.

---

## 11. Azure Functions and External Dependencies

**Not migrated by `scripts/py/migration/`** **(fact—repo)** — README states Azure Functions / ARM are out of scope.

**(fact—repo)** `config/.env.public.dev`:

- `FUNCTION_BASE_URL="https://sbpubdef-agfwa0d9e3b9anch.westus3-01.azurewebsites.net"`
- `FUNCTION_API_APP_ID="c852c7d6-8c34-4b51-a368-92be5f2ac96a"`

**Actions for target environment (unknown—operational):**

- Deploy or replicate Function App in Azure subscription linked to **target** tenant.
- Set Function App **application settings** from equivalent of `.env.public.dev` / docs (`docs/azure functions/azure functions.md`).
- Entra app registration for API authentication (`docs/azure functions/securing azure functions.md`).

---

## 12. Permissions and Entra Group Dependencies

### 12.1 Export limitations **(fact—repo)**

`export_permissions.py` may not capture **list-level** or **item-level** unique permissions fully; SharePoint REST may **401** with app-only.

### 12.2 Entra groups **(fact—repo)**

`docs/transfer of work/transfer of work.md` tables security groups (Attorney, CDD, …). **`config/.env.public.dev`** maps **`ROLE_*`** strings used by the front-end for “view as” / role selection.

**Target tenant:** recreate groups or update **`ROLE_*` / `CANVIEW_*`** to new group **display names** and IDs **(unknown)**.

### 12.3 Verification checklist **(manual)**

Use **`diagnose_permissions_migration.py`** output plus:

- [ ] Site owners / members / visitors
- [ ] Unique permissions on sensitive libraries
- [ ] Guest / sharing settings
- [ ] SPFx API consent vs Entra app used by Functions

---

## 13. Known Hardcoded or Tenant-Specific Values

| Area | Example **(fact—repo)** | Action |
|------|-------------------------|--------|
| Tenant hostname | `TENANT_NAME` in `.env.public.dev` / `.env.public.prod` | Set for **target** in new env layers |
| Hub / site | `HUB_NAME`, `HUB_SITEID` | Update for target site |
| Azure Functions URL | `FUNCTION_BASE_URL` | Point to target deployment |
| API app id | `FUNCTION_API_APP_ID`, package-solution `resource` GUID | Match target app registration |
| List titles | `LIST_*` | Must match SharePoint list **titles** on target |
| Internal columns | `INTERNALCOLUMN_*` | Must match recreated columns |
| Solution version | `package-solution.json` | Bump when upgrading deployed package |

**(fact—repo)** Some TS builds URLs with `` `/sites/${ENV.HUB_NAME}/...` `` — wrong hub breaks deep links.

---

## 14. Recommended Migration Order

Combined **tooling + operations**:

| Step | Action |
|------|--------|
| 1 | Freeze changes on source site where possible |
| 2 | Run **`run_full_export.py`** on **source** credentials |
| 3 | Archive export folder off-box |
| 4 | Create **target** site collection + Entra apps / groups baseline |
| 5 | Create **`config/.env.migration.target`** |
| 6 | Run **`run_full_import.py`** (dry-run first where sensible) |
| 7 | Manual: content types / columns / views gaps per reports |
| 8 | **`pnpm run make`** → upload **`.sppkg`** to **target** app catalog |
| 9 | Update **SPFx env** for target (`gen-env` / public env files) |
|10 | Point **Azure Functions** (or disable features) for target |
|11 | **`validate_import.py`** + smoke tests |
|12 | Permissions audit (section 12) |

---

## 15. Manual Steps and Known Limitations

**Automated:** site ping, list/library shell create, text columns, non–doc-lib items (best effort), library uploads, validation counts, page/web part **reports**.

**Manual / partial:** content types, site columns, views, most non-text columns, permissions, full page canvas API, lookup/person remapping, Azure Functions infrastructure.

**Pages:** reconstruction reports, not blind Graph POST of export JSON.

**Permissions:** checklist-driven; export may be incomplete.

---

## 16. Validation / Smoke Test Checklist

| Check | Tool / method |
|-------|----------------|
| Lists exist | `validate_import.py` + SharePoint UI |
| Libraries / files | Compare counts to export manifest; spot-check files |
| Assignments has internal column **Status** (and **no** `Statuc`) | `validate_import.py` + UI |
| SPFx loads | Home page, key web parts |
| API calls | Browser network tab to Functions + Graph |
| Role “view as” | Login as sample users per role **(assumption)** |

---

## 17. Gaps to Verify Before Shutdown

- [ ] Full **permissions** parity (site, list, item) **(unknown)**
- [ ] **Entra** group IDs vs `ROLE_*` env **(unknown)**
- [ ] **Azure Functions** endpoints and secrets in target **(unknown)**
- [ ] **Mail / Calendar** permissions for app registration **(unknown)**
- [ ] **Search / hub** associations if used **(unknown)**
- [ ] **Backup** of export bundle + `.sppkg` + documented env values

---

## 18. Final Handoff Checklist

- [ ] Latest **`run_full_export`** completed; output stored securely
- [ ] **`config/.env.migration.target`** documented for operators (not committed)
- [ ] **Target** site URL matches future **`HUB_NAME`** / `MIGRATION_TARGET_SITE_NAME`
- [ ] Canonical schema documented (Assignments.Status; legacy `Statuc` only in old exports)
- [ ] **SPFx** deployed and version bumped if replacing solution
- [ ] **Functions** live or features toggled off intentionally
- [ ] **Smoke tests** passed (section 16)
- [ ] **Stakeholder sign-off** on decommission date **(assumption)**

---

## Appendix A — Original transfer-of-work highlights **(fact—repo)**

From **`transfer of work.md`:** M365 Business Premium / Entra groups, Communication Site **PD Intranet**, update **`package-solution.json`** web API requests from app registration, prod env for Azure Functions, security groups table with **displayName / id** (source tenant snapshot — **do not** assume IDs transfer).

---

## Appendix B — Suggested next prompt for a Cursor agent

> Using `docs/transfer of work/project transfer and environment migration.md` and the export at `MIGRATION_EXPORT_DIR`, harden `import_list_items` for lookup/person fields; extend `import_list_columns` for choice/number columns where Graph supports it; add optional field-mapping CSV for old→new lookup IDs; re-run `validate_import.py` against the target site and produce a short delta report.

---

*Document generated from repo state: migration scripts in `scripts/py/migration/`, `config/.env.public.*`, `config/package-solution.json`, `docs/transfer of work/transfer of work.md`, and grep-backed code references.*
