# SharePoint Online migration (export + target import)

Python scripts under this folder support **exporting** a source SharePoint site and **provisioning / importing** into a **target** tenant using that bundle. Extraction is under the configured output root (default **`scripts/py/migration/.migration_output`**; override with `MIGRATION_OUTPUT_DIR` or `MIGRATION_EXPORT_DIR` for imports). Imports are a **rebuild / provision** process, not a blind restore — see **Import** below.

## Prerequisites

- Python 3.10+ with packages used elsewhere in this repo: `requests`, `msal`, `python-dotenv`.
- Azure AD app registration with application permissions sufficient for:

  - **Microsoft Graph:** `Sites.Read.All` (and typically `User.Read.All` if you later resolve users elsewhere). Pages export uses **Graph beta** (`Sites.Read.All` covers reading site pages in most tenants).
  - **SharePoint:** Application permission to the SharePoint resource (same tenant hostname as `TENANT_NAME`) for SharePoint REST calls used in permissions export (`Sites.FullControl.All` or `Sites.Read.All` depending on tenant policy).

- Repository **config** files (see `config/.env.example` and your local `config/.env.dev` / `config/env.public` patterns). The existing helper `azure_function.sbpubdef.local_upload` loads `config/env.public`, `config/.env.public.dev`, and `config/.env.dev` when present.

## Configuration (environment variables)

Centralize credentials and site selection in `config/.env.dev` (or your usual env files). Do **not** hardcode secrets in scripts.

| Variable | Purpose |
|----------|---------|
| `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` | App-only authentication (same as other `scripts/py` tools). |
| `TENANT_NAME` | SharePoint hostname prefix (e.g. `contoso` for `contoso.sharepoint.com`). Needed for SharePoint REST token and permission helpers. |
| `MIGRATION_SITE_NAME` | Site path name (`/sites/{name}`). If unset, **`HUB_NAME`** is used for compatibility with existing scripts. |
| `MIGRATION_OUTPUT_DIR` | Optional. Output root directory. Default: **`scripts/py/migration/.migration_output`** relative to the repository root. May be absolute. |
| `MIGRATION_LIST_ITEMS_PAGE_SIZE` | Optional. Page size for list items (50–999). Default `200`. |
| `MIGRATION_EXPORT_DOC_LIB_LIST_ITEMS` | Optional. If `true`, exports Graph list items for document libraries as well. Default `false` (files come from **export_libraries**). |

## How to run

From the **repository root**:

```bash
PYTHONPATH=scripts/py python3 scripts/py/migration/run_full_export.py
```

Individual steps (same `PYTHONPATH`):

```bash
PYTHONPATH=scripts/py python3 scripts/py/migration/export_site.py
PYTHONPATH=scripts/py python3 scripts/py/migration/export_content_types.py
PYTHONPATH=scripts/py python3 scripts/py/migration/export_lists.py
PYTHONPATH=scripts/py python3 scripts/py/migration/export_list_items.py
PYTHONPATH=scripts/py python3 scripts/py/migration/export_libraries.py
PYTHONPATH=scripts/py python3 scripts/py/migration/export_pages.py
PYTHONPATH=scripts/py python3 scripts/py/migration/export_permissions.py
```

Optional: `--site-id` on scripts that support it skips resolving the site by name (advanced).

## Output layout

Under the configured output root (see `MIGRATION_OUTPUT_DIR` above):

| Path | Contents |
|------|-----------|
| `site/site.json` | Site metadata from Graph. |
| `content_types/` | Site content types and per-type column payloads (when API allows). |
| `lists/index.json` | Index of all lists. |
| `lists/<name>_<id>/` | `list.json`, `columns.json`, `views.json` per list (`views.json` includes a `source` field: Graph vs SharePoint REST). |
| `list_items/` | One `.jsonl` file per list; each line is an item with `fields` keyed by internal names as Graph returns them. |
| `libraries/<drive>/files/` | Library files; each file has a sibling `*.metadata.json` with the Graph **driveItem**. |
| `libraries/_manifest.json` | Drive summary. |
| `pages/` | Beta pages list (`index.json`) and per-page JSON when detail GET succeeds. |
| `permissions/` | Graph site permissions + SharePoint REST site groups / role assignments when accessible; `notes.json` explains gaps. |

## What gets exported / known limitations

- **Azure Functions / Azure resources:** These scripts only target **SharePoint Online** (Graph + optional SharePoint REST). They do **not** export or migrate Azure Function Apps, app settings, deployment storage, Application Insights, or ARM definitions. For the Flex Consumption app you described, capture configuration separately (e.g. `az functionapp config appsettings list`, deployment slot exports, IaC templates, and this repo’s `scripts/py/azure_function` sources).

- **Lists and columns:** Full Graph column definitions; internal names are in each column’s `name` property (including typos such as `Statuc`).
- **Views:** Many tenants do **not** expose `GET .../lists/{id}/views` on Graph (400 “segment 'views'”). The exporter then uses SharePoint REST `/_api/web/lists(guid'...')/views` when `list.json` includes `sharePointIds.listId`. **App-only tokens are often rejected (401) by SharePoint REST** even when Graph works; in that case views stay empty unless you use a token SPO accepts for REST (e.g. delegated) or a different app configuration.
- **List items:** Paginated; lookup columns appear as Graph exposes them (often `*LookupId` / expanded forms). Document library rows may be skipped by default to avoid duplicating drive exports—see `MIGRATION_EXPORT_DOC_LIB_LIST_ITEMS`.
- **Libraries:** All files discovered via drive **children** traversal; very large libraries may take a long time and hit throttling (retries are included).
- **Pages:** Uses **Graph beta**. Application permission **`Sites.Read.All`** (or `Sites.ReadWrite.All`) is what Microsoft documents for reading site pages; there is usually **no extra “PnP” permission** that fixes OData expand quirks. Layout is loaded via **`GET .../microsoft.graph.sitePage/canvasLayout`** and merged into the page JSON (avoids `$expand=canvasLayout` failures some tenants return for `baseSitePage`). Classic pages not in the modern pages API may only exist as files under `libraries/` (e.g. Site Pages library).

- **Permissions:** Site-level Graph permissions + SharePoint REST site groups and role assignments **best effort**. **`401 Unsupported app only token`** on `/_api/web/...` is **not** fixed by adding another Microsoft Graph permission alone: SharePoint Online often rejects **app-only bearer** calls to classic SharePoint REST even when Graph and drive downloads work. Options include delegated (user) tokens, certificate-based app-only access where your org allows it, or relying on Graph-only permission exports. Item-level unique permissions are **not** walked.

Scripts are **idempotent** in the sense that they overwrite artifacts for each run (JSONL files are recreated per list; files in `libraries/` are overwritten on download).

## Shared module

- **`sp_client.py`** — Graph pagination, retries, JSON export helpers, SharePoint REST GETs, `graph_post` / `graph_patch`, and re-exports `authenticate` / `get_site_id` / list helpers from `azure_function.sbpubdef.local_upload`.
- **`config.py`** — Export output path and source site name resolution.
- **`import_context.py`** — Loads **`config/.env.migration.target`** only; target site name and `MIGRATION_EXPORT_DIR`.
- **`import_client.py`** — Read export JSON, write `import_reports/*.json`, list id map, drive uploads.

---

## Target app registration (prerequisite for import)

See **[`target_app_registration.md`](target_app_registration.md)** for:

- Tenant ID, client ID, secret/certificate handling  
- **Graph** permissions (`Sites.ReadWrite.All` typical for import; `Sites.Read.All` for read-only validation)  
- **SharePoint** application permissions and admin consent  
- SharePoint REST vs Graph token behavior (401 app-only notes)

Create **`config/.env.migration.target`** from **`config/.env.migration.target.example`** (file is **gitignored**). Do **not** put target secrets into `config/.env.dev` unless you intentionally want them there.

---

## Import / provision (target tenant)

### Philosophy

- Use exported JSON as **source of truth**, but **transform** URLs, ids, and tenant-specific references where needed.  
- **Preserve internal column names exactly** (example: internal `Statuc` vs display name `Status` — do not “fix” the typo during import unless you accept breaking compatibility).  
- Where Graph is unsafe or incomplete, scripts write **reports and checklists** instead of pretending success.

### Environment (`config/.env.migration.target`)

| Variable | Purpose |
|----------|---------|
| `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` | App-only to **target** tenant (or multi-tenant app). |
| `TENANT_NAME` | **Target** SharePoint hostname prefix. |
| `MIGRATION_TARGET_SITE_NAME` | Target site path (`/sites/{name}`). |
| `MIGRATION_EXPORT_DIR` | Folder containing the **export** tree (`lists/`, `list_items/`, `libraries/`, `pages/`, …). |
| `MIGRATION_DRY_RUN` | `true` = log only, no creates/uploads. |
| `MIGRATION_LIST_BLOCKLIST` | Comma-separated list **internal** names to skip creating (default includes `users`, `TaxonomyHiddenList`). |
| `MIGRATION_SKIP_SYSTEM_LISTS` | Default `true`: skip export index rows with `system: true`. |

### Run order (orchestrated)

`run_full_import.py` runs:

1. **`provision_site.py`** — Validates Graph auth and that the target site exists.  
2. **`import_content_types.py`** — Inventory + **manual** checklist (full CT automation not implemented).  
3. **`import_site_columns.py`** — Site columns **manual** checklist.  
4. **`import_lists.py`** — Creates lists / libraries from `lists/index.json`; writes **`import_reports/list_name_to_new_id.json`**.  
5. **`import_list_columns.py`** — Creates **text-only** columns via Graph; other types listed for manual/PnP.  
6. **`import_list_views.py`** — Views **manual** checklist from export.  
7. **`import_list_items.py`** — Creates items from `list_items/*.jsonl` (skips document libraries).  
8. **`import_libraries.py`** — Compares export `_manifest.json` drive names to target drives.  
9. **`upload_library_files.py`** — Uploads files under `libraries/<drive>/files/`.  
10. **Manual** — Deploy SPFx `.sppkg` to target app catalog (`pnpm run make`, then SharePoint admin).  
11. **`provision_pages.py`** — Generates **per-page reconstruction Markdown** under `import_reports/page_reconstruction/`.  
12. **`apply_page_webparts.py`** — Aggregates web parts into remediation JSON/Markdown.  
13. **`validate_import.py`** — Read-only comparison vs export (counts, missing lists, `Statuc` spot-check).  
14. **`diagnose_permissions_migration.py`** — Permissions **manual** checklist (uses export `permissions/` if present).

### Commands

```bash
# Full import pipeline (target env required)
PYTHONPATH=scripts/py python3 scripts/py/migration/run_full_import.py

# Or individual steps
PYTHONPATH=scripts/py python3 scripts/py/migration/provision_site.py
PYTHONPATH=scripts/py python3 scripts/py/migration/import_lists.py
# … etc.
```

### What is automated vs manual

| Automated (best effort) | Manual / report |
|-------------------------|-----------------|
| Site reachability check | Creating the **root** site collection if it does not exist |
| List / document library create (Graph) | Full **content type** hierarchy, hub inheritance |
| Text columns on lists | Most non-text columns, choice/lookup/person complexity |
| List items (non–doc-lib) | Person/lookup resolution, attachments |
| Library file upload (Graph PUT) | Very large files, path edge cases, special metadata |
| Validation counts | **Permissions** recreation (see diagnose script) |
| Page / web part **reports** | Actual **Graph page POST** / canvas PATCH after SPFx deploy |

### SPFx

- Build and package: **`pnpm run make`** (see repo README).  
- Install the `.sppkg` on the **target** tenant app catalog before expecting custom web parts to match export.

### Permissions migration (TODO / limits)

- Exports may **not** include list- or item-level unique permissions.  
- **`diagnose_permissions_migration.py`** emits a **manual verification checklist** and embeds export `permissions/notes.json` when available.  
- **TODO (operators):** Review site groups, broken inheritance, Entra group bindings, and sharing links in the target admin UIs.

### Troubleshooting (import)

- **`import_lists` errors**: template not supported, name collision, or missing `Sites.ReadWrite.All`.  
- **`import_list_items` errors**: Graph rejects fields (read-only, missing column, lookup id from old tenant). Strip or remap fields in a follow-up script.  
- **`upload_library_files`**: target drive **name** must match export manifest; create libraries first.  
- **Internal names**: never rename columns in import scripts unless you add an explicit compatibility flag and document it.

---

## Export (source tenant) — details

The **Prerequisites**, **Configuration**, **How to run**, **Output layout**, and **What gets exported** sections **above** describe **export** using `config/.env.dev` / your usual env files — **not** `config/.env.migration.target`.
