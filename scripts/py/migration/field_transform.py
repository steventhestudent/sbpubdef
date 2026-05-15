"""
Transform exported list item field values for Microsoft Graph create/patch payloads.

Uses column metadata from exported columns.json (Graph-shaped).
"""

from __future__ import annotations

from typing import Any

from migration import import_context as _ictx
from migration.column_schema import choice_allow_multiple_values, column_kind, is_note_text_column


def rewrite_source_site_urls_in_str(s: str) -> str:
    """
    Replace occurrences of the exported source site base URL with the target site base URL.

    Source base: ``MIGRATION_SOURCE_SITE_URL`` or ``site/site.json`` ``webUrl`` in the export bundle.
    Target base: ``https://{TENANT_NAME}.sharepoint.com/sites/{MIGRATION_TARGET_SITE_NAME}``.

    Disable with ``MIGRATION_REWRITE_SOURCE_SITE_URLS=false``.
    """
    if not s or not _ictx.migration_url_rewrite_enabled():
        return s
    src = _ictx.migration_source_site_absolute_url()
    if not src or src not in s:
        return s
    try:
        tgt = _ictx.migration_target_site_absolute_url()
    except ValueError:
        return s
    if src == tgt:
        return s
    return s.replace(src, tgt)


def rewrite_source_site_urls_in_value(value: Any) -> Any:
    """Deep rewrite for hyperlink dicts, lists of strings, etc."""
    if not _ictx.migration_url_rewrite_enabled():
        return value
    src = _ictx.migration_source_site_absolute_url()
    if not src:
        return value
    try:
        tgt = _ictx.migration_target_site_absolute_url()
    except ValueError:
        return value
    if src == tgt:
        return value
    return _replace_src_prefix_deep(value, src, tgt)


def _replace_src_prefix_deep(value: Any, src: str, tgt: str) -> Any:
    if isinstance(value, str):
        return value.replace(src, tgt) if src in value else value
    if isinstance(value, dict):
        return {k: _replace_src_prefix_deep(v, src, tgt) for k, v in value.items()}
    if isinstance(value, list):
        return [_replace_src_prefix_deep(x, src, tgt) for x in value]
    return value


def _bool_coerce(v: Any) -> bool | None:
    if v is None:
        return None
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return bool(v)
    s = str(v).strip().lower()
    if s in ("1", "true", "yes", "on"):
        return True
    if s in ("0", "false", "no", "off", ""):
        return False
    return None


def _number_coerce(v: Any) -> float | int | None:
    if v is None or v == "":
        return None
    if isinstance(v, bool):
        return None
    if isinstance(v, int) and not isinstance(v, bool):
        return v
    if isinstance(v, float):
        return v
    try:
        f = float(str(v).strip())
        if f.is_integer():
            return int(f)
        return f
    except (ValueError, TypeError):
        return None


def value_for_graph_field(col: dict[str, Any], raw: Any) -> tuple[Any | None, str | None]:
    """
    Returns (value, None) to send in fields{}, or (None, reason) to omit.

    Does not handle lookups (handled in pass 2) or personOrGroup (policy: omit).
    """
    kind = column_kind(col)

    if kind == "personOrGroup":
        return None, "person_field_deferred_report_only"

    if kind == "lookup":
        return None, "lookup_field_pass2"

    if kind == "calculated":
        return None, "calculated_readonly"

    if kind == "term":
        return None, "managed_metadata_not_supported"

    if raw is None:
        return None, None

    if kind == "text":
        if isinstance(raw, str):
            return rewrite_source_site_urls_in_str(raw), None
        return rewrite_source_site_urls_in_str(str(raw)), None

    if kind == "choice":
        if choice_allow_multiple_values(col):
            if isinstance(raw, list):
                return [
                    rewrite_source_site_urls_in_str(str(x)) for x in raw if x is not None and str(x).strip()
                ], None
            if isinstance(raw, str) and raw.strip().startswith("["):
                # loose CSV-ish JSON
                try:
                    import json

                    parsed = json.loads(raw)
                    if isinstance(parsed, list):
                        return [rewrite_source_site_urls_in_str(str(x)) for x in parsed], None
                except json.JSONDecodeError:
                    pass
            if raw is None or raw == "":
                return None, None
            return [rewrite_source_site_urls_in_str(str(raw))], None
        return rewrite_source_site_urls_in_str(str(raw)), None

    if kind == "number":
        n = _number_coerce(raw)
        return (n, None) if n is not None else (None, "invalid_number")

    if kind == "currency":
        n = _number_coerce(raw)
        return (n, None) if n is not None else (None, "invalid_currency")

    if kind == "boolean":
        b = _bool_coerce(raw)
        return (b, None) if b is not None else (None, "invalid_boolean")

    if kind == "dateTime":
        if isinstance(raw, str):
            return rewrite_source_site_urls_in_str(raw), None
        return rewrite_source_site_urls_in_str(str(raw)), None

    if kind == "hyperlinkOrPicture":
        raw = rewrite_source_site_urls_in_value(raw)
        if isinstance(raw, dict) and "Url" in raw:
            return raw, None
        if isinstance(raw, str):
            u = rewrite_source_site_urls_in_str(raw)
            return {"Url": u, "Description": u}, None
        return None, "invalid_hyperlink"

    # Fallback: columns only exposing text shape (multi-line note still uses text{})
    if col.get("text"):
        if is_note_text_column(col):
            if isinstance(raw, str):
                return rewrite_source_site_urls_in_str(raw), None
            return rewrite_source_site_urls_in_str(str(raw)), None
        if isinstance(raw, str):
            return rewrite_source_site_urls_in_str(raw), None
        return rewrite_source_site_urls_in_str(str(raw)), None

    return None, f"no_transform_for_kind:{kind}"
