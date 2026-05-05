# Target tenant — Entra app registration (migration automation)

Use a **dedicated** app registration for the **destination** tenant (recommended: **sbpubdef-provisioning**), or the same multi-tenant app if your security model allows it. Grant **admin consent** in the **target** tenant after adding API permissions.

Keep **mail, calendar, and tenant-wide SharePoint** permissions on your **Azure Functions / EasyAuth** app (or other registrations)—not on the provisioning app unless you intentionally want one highly privileged daemon.

## Values to record

| Item | Where to find / store |
|------|------------------------|
| **Directory (tenant) ID** | Entra ID → App registrations → *your app* → Overview |
| **Application (client) ID** | Same |
| **Client secret** (or certificate) | Certificates & secrets — store only in `config/.env.migration.target` (gitignored) or a vault |
| **Redirect URIs** | Not required for **client credentials** (daemon) flows used by these scripts |

## Microsoft Graph — application permissions (recommended: least privilege)

### `Sites.Selected` (recommended)

| Permission | Used for |
|------------|-----------|
| **`Sites.Selected`** | All Graph access used by migration **import** / **export** **after** you grant this app access to each site collection you need (see below). Scripts resolve the site with `GET /sites/{hostname}:/sites/{path}` then call `/sites/{id}/lists/...`, `/drives/...`, etc.—you do **not** embed the site collection ID in every request in code; only the **one-time grant** uses that ID. |

**One-time grant per site collection** (tenant admin or break-glass app):

1. Obtain the **site collection id** (GUID), e.g. while signed in as a site admin:  
   `https://{tenant}.sharepoint.com/sites/{site-name}/_api/site/id`
2. Call Microsoft Graph (see [permission resource](https://learn.microsoft.com/en-us/graph/api/resources/permission) and **Create permission** on a site):  
   `POST https://graph.microsoft.com/v1.0/sites/{siteCollectionId}/permissions`  
   with a body that grants your provisioning app’s **Application (client) ID** a role of **`write`** (start here) or **`owner`** if something fails and you need full control on that site only.  
   Walkthrough (same idea as Microsoft’s flow): [Use Sites.Selected application permission in Microsoft Graph — Darwin Droll](https://www.darwindroll.com/blog/use-sitesselected-application-permission-in-microsoft-graph).  
   To perform the POST you can use **Graph Explorer** as an admin, or a **separate** app registration with a highly privileged application permission (e.g. `Sites.FullControl.All`) used only for this setup—then retire or lock down that app.

3. **Grant admin consent** for **`Sites.Selected`** on **sbpubdef-provisioning** in Entra → API permissions.

Repeat step 2 for each additional site if you automate more than one hub.

### Legacy / broad alternative (tenant-wide)

Use only if you cannot use the permissions API or your admins require a single broad permission:

| Permission | Used for |
|------------|-----------|
| `Sites.ReadWrite.All` | Create lists, columns (subset), list items, upload files to document libraries, pages APIs if enabled |
| `Sites.Read.All` | Minimum for read-only validation (`validate_import.py` against live site); often subsumed by `Sites.ReadWrite.All` |

Optional (only if you extend scripts):

| Permission | Notes |
|------------|--------|
| `User.Read.All` | Resolving users for person fields (not implemented in default import) |
| `Group.Read.All` | Auditing Entra groups tied to permissions (diagnostics only) |

## SharePoint (Office 365 SharePoint Online) — application permissions

| When | Permission | Notes |
|------|------------|--------|
| **Graph-only migration** (`run_full_import.py` and other import modules) | *Often none required* | Import paths use **Microsoft Graph** only. `local_upload.authenticate()` may still request `https://{TENANT_NAME}.sharepoint.com/.default`; if the app has no SPO application permissions, the SharePoint token may be absent—**that is OK** for import. |
| **Export** paths that call SharePoint REST (`/_api/...`), e.g. `export_permissions.py`, `export_lists.py` views fallback | `Sites.FullControl.All` or `Sites.ReadWrite.All` (tenant-wide) **or** align with your tenant’s app-only REST policy | Some tenants return **401 Unsupported app only token** for REST even when Graph succeeds. |

If you standardize on **Graph `Sites.Selected`** for provisioning, prefer **not** to duplicate tenant-wide **SharePoint** `Sites.ReadWrite.All` on the same app unless you hit REST-only gaps.

## Token behavior (important)

- **Graph** calls use `https://graph.microsoft.com/.default` (already implemented in `local_upload.authenticate()`).
- **SharePoint REST** (`/_api/...`) uses `https://{TENANT_NAME}.sharepoint.com/.default`. Import scripts rely primarily on **Graph**; REST-based steps are mainly on **export**.

## Admin consent

- A Global Administrator or Privileged Role Administrator must consent to **application** permissions.
- Without consent, token acquisition succeeds but API calls return **403**.

## Rotation

- Rotate client secrets on a schedule; update `config/.env.migration.target` only on secure workstations.

## Do not commit

- Keep `config/.env.migration.target` **local** and **gitignored** (see repository `.gitignore`).
- Commit only `config/.env.migration.target.example` as a template.
