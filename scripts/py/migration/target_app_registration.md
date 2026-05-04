# Target tenant — Entra app registration (migration automation)

Use a **dedicated** app registration for the **destination** tenant (recommended), or the same multi-tenant app if your security model allows it. Grant **admin consent** in the **target** tenant after adding API permissions.

## Values to record

| Item | Where to find / store |
|------|------------------------|
| **Directory (tenant) ID** | Entra ID → App registrations → *your app* → Overview |
| **Application (client) ID** | Same |
| **Client secret** (or certificate) | Certificates & secrets — store only in `config/.env.migration.target` (gitignored) or a vault |
| **Redirect URIs** | Not required for **client credentials** (daemon) flows used by these scripts |

## Microsoft Graph — application permissions

Least privilege for **import** is typically higher than for export alone.

| Permission | Used for |
|------------|-----------|
| `Sites.ReadWrite.All` | Create lists, columns (subset), list items, upload files to document libraries, pages APIs if enabled |
| `Sites.Read.All` | Minimum for read-only validation (`validate_import.py` against live site) |

Optional (only if you extend scripts):

| Permission | Notes |
|------------|--------|
| `User.Read.All` | Resolving users for person fields (not implemented in default import) |
| `Group.Read.All` | Auditing Entra groups tied to permissions (diagnostics only) |

## SharePoint (Windows Azure Active Directory)

Add **Application permissions** for **Office 365 SharePoint Online**:

| Permission | Notes |
|------------|--------|
| `Sites.FullControl.All` or `Sites.ReadWrite.All` | Same scope as Graph site writes; required for heavy provisioning in some paths |

Then **Grant admin consent for {tenant}**.

## Token behavior (important)

- **Graph** calls use `https://graph.microsoft.com/.default` (already implemented in `local_upload.authenticate()`).
- **SharePoint REST** (`/_api/...`) uses `https://{TENANT_NAME}.sharepoint.com/.default`. Some tenants return **401 Unsupported app only token** for SharePoint REST even when Graph succeeds. Import scripts rely primarily on **Graph**; REST-based steps may require delegated auth or tenant policy changes.

## Admin consent

- A Global Administrator or Privileged Role Administrator must consent to **application** permissions.
- Without consent, token acquisition succeeds but API calls return **403**.

## Rotation

- Rotate client secrets on a schedule; update `config/.env.migration.target` only on secure workstations.

## Do not commit

- Keep `config/.env.migration.target` **local** and **gitignored** (see repository `.gitignore`).
- Commit only `config/.env.migration.target.example` as a template.
