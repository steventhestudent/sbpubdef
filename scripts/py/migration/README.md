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
| `MIGRATION_DRY_RUN` | `true` = log only, no creates/uploads (also `--dry-run` on `run_full_import.py` / some steps). |
| `MIGRATION_LIST_BLOCKLIST` | Comma-separated list **internal** names to skip creating (default includes `users`, `TaxonomyHiddenList`). |
| `MIGRATION_LIST_ALLOWLIST` | Optional. Comma-separated **internal** names to limit `import_lists`, `import_list_columns`, `schema_diff`, and `import_list_items`. Lists referenced by lookup columns on those lists are included automatically so lookup columns can be created. Also set via `run_full_import.py --lists A,B`. |
| `MIGRATION_SKIP_SYSTEM_LISTS` | Default `true`: skip export index rows with `system: true`. |
| `MIGRATION_SPFX_DEPLOYED` | Optional. Set `true` after the SPFx `.sppkg` is deployed in the **target** tenant. `provision_pages.py` will skip attempting custom web parts unless this is set. |
| `MIGRATION_SKIP_CANVAS_PATCH` | Optional. Set `true` to skip applying exported `canvasLayout` (page stays default shell until you edit manually). |

### Run order (orchestrated)

`run_full_import.py` runs:

1. **`provision_site.py`** — Validates Graph auth and that the target site exists.  
2. **`import_content_types.py`** — Inventory + **targeted automation** for project content types (**PD Announcement**, **PD Events**) and linking them to `SitePages` (full CT automation still not implemented).  
3. **`import_site_columns.py`** — Site columns **manual** checklist.  
4. **`list_identity.py`** — Writes **`reports/list_identity_report.json`** (display vs internal names, collisions).  
5. **`list_import_order.py`** — Writes **`reports/list_import_order.json`** (lookup-aware item order).  
6. **`import_lists.py`** — Creates lists / libraries from `lists/index.json`; writes **`import_reports/list_name_to_new_id.json`** (uses import order when present).  
7. **`import_list_columns.py`** — Creates columns via Graph (**text, note, choice, multi-choice, number, currency, boolean, dateTime, hyperlink, person/group, lookup**) — lookups in phase 2 after all lists exist.  
8. **`import_list_views.py`** — Views **manual** checklist from export.  
9. **`schema_diff.py`** — Writes **`reports/schema_diff_<list>.json`**, **`.md`**, and **`reports/schema_diff_summary.json`** — gates item import (`itemImportReady`).  
10. **`import_list_items.py`** — Two-pass items from `list_items/*.jsonl` (pass 1 create; pass 2 PATCH lookups); skips document libraries; writes **`state/item_id_map.json`**, **`reports/item_import_failures_<list>.json`**, **`reports/unresolved_users.json`**.  
11. **`import_libraries.py`** — Compares export `_manifest.json` drive names to target drives.  
12. **`upload_library_files.py`** — Uploads files under `libraries/<drive>/files/`.  
13. **Manual** — Deploy SPFx `.sppkg` to target app catalog (`pnpm run make`, then SharePoint admin).  
14. **`provision_pages.py`** — **Targeted** modern page provision (best-effort): creates a page shell, **PATCHes `canvasLayout` from export** (draft, before publish), then **publishes**; writes per-page reports under `import_reports/page_reconstruction/` and `reports/page_import_summary.json`. Web part **instance** `id` values from the source tenant are stripped so the target assigns new ones.  
    - **Publishing** uses the typed Graph endpoint: `POST /sites/{siteId}/pages/{pageId}/microsoft.graph.sitePage/publish`  
15. **`apply_page_webparts.py`** — Aggregates web parts into remediation JSON/Markdown.  
16. **`validate_import.py`** — Read-only comparison vs export (counts, missing lists, `Statuc` spot-check).  
17. **`diagnose_permissions_migration.py`** — Permissions **manual** checklist (uses export `permissions/` if present).

Structured artifacts live under the migration export root (`MIGRATION_EXPORT_DIR`, default `scripts/py/migration/.migration_output/`):

| Path | Purpose |
|------|---------|
| `reports/` | Schema diff, import order, identity, item failures, unresolved users |
| `state/item_id_map.json` | Source list item id → target Graph item id (for lookups) |
| `import_reports/` | Legacy JSON summaries (`import_lists.json`, …) |

### Commands

```bash
# Full import pipeline (target env required)
PYTHONPATH=scripts/py python3 scripts/py/migration/run_full_import.py

# Rehearsal: no list/item mutations (still performs Graph reads for schema diff / validation paths that GET data)
PYTHONPATH=scripts/py python3 scripts/py/migration/run_full_import.py --dry-run

PYTHONPATH=scripts/py python3 scripts/py/migration/run_full_import.py --skip-library-uploads

# Or individual steps
PYTHONPATH=scripts/py python3 scripts/py/migration/provision_site.py
PYTHONPATH=scripts/py python3 scripts/py/migration/list_identity.py
PYTHONPATH=scripts/py python3 scripts/py/migration/list_import_order.py
PYTHONPATH=scripts/py python3 scripts/py/migration/import_lists.py
PYTHONPATH=scripts/py python3 scripts/py/migration/import_list_columns.py
PYTHONPATH=scripts/py python3 scripts/py/migration/schema_diff.py
PYTHONPATH=scripts/py python3 scripts/py/migration/import_list_items.py
# … etc.
```

### What is automated vs manual

| Automated (best effort) | Manual / report |
|-------------------------|-----------------|
| Site reachability check | Creating the **root** site collection if it does not exist |
| List / document library create (Graph) | Full **content type** hierarchy, hub inheritance |
| Typed list columns (Graph) — see step 7 above | **Managed metadata** (`term`), **calculated** columns (skipped + documented), exotic column types |
| List items with **typed** fields + **two-pass lookups** | **Person/User values** (not resolved by Graph in this repo — see `reports/unresolved_users.json`) |
| Lookup IDs remapped via `state/item_id_map.json` | Attachments, corrupt export rows |
| Library file upload (Graph PUT) | Very large files, path edge cases, special metadata |
| Schema diff + failure JSON per list | **Permissions** recreation (see diagnose script) |
| Page / web part **reports** | Actual **Graph page POST** / canvas PATCH after SPFx deploy |

### SPFx

- Build and package: **`pnpm run make`** (see repo README).  
- Install the `.sppkg` on the **target** tenant app catalog before expecting custom web parts to match export.

### Permissions migration (TODO / limits)

- Exports may **not** include list- or item-level unique permissions.  
- **`diagnose_permissions_migration.py`** emits a **manual verification checklist** and embeds export `permissions/notes.json` when available.  
- **TODO (operators):** Review site groups, broken inheritance, Entra group bindings, and sharing links in the target admin UIs.

### Troubleshooting (import)

#### Why list items fail or stay at zero

1. **`reports/schema_diff_<list>.md`** — If `itemImportReady` is **false**, **`import_list_items.py` will not import** that list (schema gate). Fix columns on the target (or re-run **`import_list_columns.py`**) until the diff is green. **App Author / App Editor** lookups often export `lookup.listId` as the token **`AppPrincipals`** (not a UUID); `schema_diff` ignores list-id equality for those so they do not block imports.  
2. **Internal vs display names** — Imports key off export **`name`** (internal). Example: display “Assignments” may still be internal `Assignments1` after renames; **`reports/list_identity_report.json`** shows collisions. SPFx/code that assumes `/Lists/Assignments` may break unless internal names match.  
3. **CSV exports** — Do **not** use CSV as source of truth for typed lists: choice sets, lookups, multi-choice, rich text, and person fields lose fidelity. Use **`list_items/*.jsonl`** and **`lists/*/columns.json`**.  
4. **Lookups** — Pass 1 creates rows **without** lookup values; pass 2 PATCHes **`…LookupId`** using **`state/item_id_map.json`**. Parent lists must import **first** (see **`reports/list_import_order.json`**). Old tenant numeric IDs are never copied blindly.  
5. **Person fields** — Values are **not** resolved to target users (no `User.Read.All`). They are logged to **`reports/unresolved_users.json`** and omitted from payloads.  
6. **`reports/item_import_failures_<list>.json`** — Item-level Graph errors and schema gate messages; safe to delete and re-run after fixes.  
7. **Read-only fields** — `_UIVersionString`, `AuthorLookupId`, built-in link fields, etc. are stripped; never “fix” by coercing types to plain text.

#### Pages (Site Pages library)

- `SitePages` is **skipped** by `import_list_items.py`. Modern pages are handled by `provision_pages.py` / `publish_pages.py`.
- Re-run `provision_pages.py` after shells already exist: on **nameAlreadyExists**, it **resolves the existing page by file name** and still applies **`canvasLayout`** (you do not need to delete pages first).
- For **PD Announcement** (newsPost) pages, `provision_pages.py` also patches the underlying **Site Pages library item** to set:
  - `ContentTypeId` (from export `contentType.id`)
  - `PDDepartment` (from export `SitePages` list item field `PD_x0020_Department`)
- Draft pages may not appear in default library views. If pages are created but not visible, run:
  - `PYTHONPATH=scripts/py python3 scripts/py/migration/publish_pages.py`
  - Then re-check `reports/page_publish_results.json` and `reports/page_import_summary.json`.

#### Rerunning after deleting lists on the target

- Re-run **`import_lists.py`** → **`import_list_columns.py`** → **`schema_diff.py`** → **`import_list_items.py`** (or full orchestrator).  
- **`state/item_id_map.json`** — Delete if you bulk-deleted target items so lookups remap cleanly.

#### Other

- **`import_lists` errors**: template not supported, name collision, or missing `Sites.ReadWrite.All` / `Sites.Selected` site grant.  
- **`upload_library_files`**: target drive **name** must match export manifest; create libraries first.  
- **Internal column typo `Statuc`** — Preserve as-is across export/import; do not rename unless you update all consumers.

---

## Export (source tenant) — details

The **Prerequisites**, **Configuration**, **How to run**, **Output layout**, and **What gets exported** sections **above** describe **export** using `config/.env.dev` / your usual env files — **not** `config/.env.migration.target`.
