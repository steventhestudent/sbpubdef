# SharePoint Online export (migration prep)

Python scripts to extract site configuration and data to local files under the configured output root (default **`scripts/py/migration/.migration_output`** relative to the repo; override with `MIGRATION_OUTPUT_DIR`). This is an **export / backup** step, not a destination migration.

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

- **`sp_client.py`** — Graph pagination, retries, JSON export helpers, SharePoint REST GETs, and re-exports `authenticate` / `get_site_id` / list helpers from `azure_function.sbpubdef.local_upload`.
- **`config.py`** — Output path and site name resolution from environment variables.
