"""
Transform exported list item field values for Microsoft Graph create/patch payloads.

Uses column metadata from exported columns.json (Graph-shaped).
"""

from __future__ import annotations

from typing import Any

from migration.column_schema import choice_allow_multiple_values, column_kind, is_note_text_column


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
            return raw, None
        return str(raw), None

    if kind == "choice":
        if choice_allow_multiple_values(col):
            if isinstance(raw, list):
                return [str(x) for x in raw if x is not None and str(x).strip()], None
            if isinstance(raw, str) and raw.strip().startswith("["):
                # loose CSV-ish JSON
                try:
                    import json

                    parsed = json.loads(raw)
                    if isinstance(parsed, list):
                        return [str(x) for x in parsed], None
                except json.JSONDecodeError:
                    pass
            if raw is None or raw == "":
                return None, None
            return [str(raw)], None
        return str(raw), None

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
            return raw, None
        return str(raw), None

    if kind == "hyperlinkOrPicture":
        if isinstance(raw, dict) and "Url" in raw:
            return raw, None
        if isinstance(raw, str):
            return {"Url": raw, "Description": raw}, None
        return None, "invalid_hyperlink"

    # Fallback: columns only exposing text shape (multi-line note still uses text{})
    if col.get("text"):
        if is_note_text_column(col):
            if isinstance(raw, str):
                return raw, None
            return str(raw), None
        if isinstance(raw, str):
            return raw, None
        return str(raw), None

    return None, f"no_transform_for_kind:{kind}"
