"""
SharePoint list column metadata helpers for migration import/export.

Works with Graph-shaped column dicts from exported `columns.json`.
"""

from __future__ import annotations

import re
from typing import Any


def column_kind(col: dict[str, Any]) -> str | None:
    """Return the primary Graph column type key, or None if unknown."""
    if not isinstance(col, dict):
        return None
    # Order matters: lookup/person before text (some columns have multiple hints)
    for k in (
        "lookup",
        "personOrGroup",
        "choice",
        "number",
        "currency",
        "boolean",
        "dateTime",
        "hyperlinkOrPicture",
        "term",
        "calculated",
        "text",
    ):
        if k in col and isinstance(col[k], dict):
            return k
    if "boolean" in col:
        return "boolean"
    return None


def is_note_text_column(col: dict[str, Any]) -> bool:
    t = col.get("text")
    if not isinstance(t, dict):
        return False
    if t.get("allowMultipleLines"):
        return True
    tt = (t.get("textType") or "").lower()
    return tt in ("richtext", "textarea", "enhancedrichtext", "plain")


def choice_allow_multiple_values(col: dict[str, Any]) -> bool:
    ch = col.get("choice")
    if not isinstance(ch, dict):
        return False
    if ch.get("allowMultipleValues") is True:
        return True
    # Do not infer multi-select from displayAs. Export bundles sometimes emit
    # displayAs="checkBoxes" even when Graph rejects allowMultipleValues on create.
    return False


def build_graph_column_create_body(
    col: dict[str, Any],
    *,
    target_lookup_list_graph_id: str | None,
) -> tuple[dict[str, Any] | None, str | None]:
    """
    Build JSON body for POST /sites/{id}/lists/{id}/columns (Graph).

    Returns (body, None) on success, or (None, reason) to skip/defer.
    """
    name = (col.get("name") or "").strip()
    disp = (col.get("displayName") or name).strip()
    if not name:
        return None, "missing_name"

    kind = column_kind(col)
    if kind == "calculated":
        return None, "calculated_not_supported"
    if kind == "term":
        return None, "managed_metadata_not_supported"

    body: dict[str, Any] = {"name": name, "displayName": disp}

    if kind == "text":
        tx = col.get("text")
        if isinstance(tx, dict) and (
            tx.get("allowMultipleLines") or (tx.get("textType") or "").lower() in ("richtext", "enhancedrichtext")
        ):
            body["text"] = {
                "allowMultipleLines": True,
                "appendChangesToExistingText": bool(tx.get("appendChangesToExistingText", False)),
                "linesForEditing": int(tx.get("linesForEditing") or 6),
                "textType": "richText"
                if str(tx.get("textType") or "").lower() in ("richtext", "enhancedrichtext")
                else "plain",
            }
        else:
            body["text"] = tx if isinstance(tx, dict) else {}
        return body, None

    if kind == "choice":
        ch = col.get("choice")
        if not isinstance(ch, dict):
            return None, "choice_missing_definition"
        choices = ch.get("choices") or []
        if not isinstance(choices, list):
            choices = []
        allow_multi = choice_allow_multiple_values(col)
        display_as = (ch.get("displayAs") or "dropDownMenu").strip()
        # Graph is picky about choice.displayAs during column creation.
        # Exports commonly emit "checkBoxes" which has caused Graph 400 invalidRequest in practice.
        # For create, prefer a stable value; multi-choice still works via allowMultipleValues.
        if display_as.lower() in ("checkboxes", "checkbox", "checkboxes "):
            display_as = "dropDownMenu"
        if display_as == "checkBoxes":
            display_as = "dropDownMenu"
        body["choice"] = {
            "allowTextEntry": bool(ch.get("allowTextEntry", False)),
            "choices": [str(c) for c in choices],
            "displayAs": display_as,
        }
        if allow_multi:
            body["choice"]["allowMultipleValues"] = True
        return body, None

    if kind == "number":
        body["number"] = col.get("number") if isinstance(col.get("number"), dict) else {}
        return body, None

    if kind == "currency":
        cur = col.get("currency")
        body["currency"] = cur if isinstance(cur, dict) else {"locale": "en-us"}
        return body, None

    if kind == "boolean":
        body["boolean"] = col.get("boolean") if isinstance(col.get("boolean"), dict) else {}
        return body, None

    if kind == "dateTime":
        dt = col.get("dateTime")
        body["dateTime"] = dt if isinstance(dt, dict) else {"displayAs": "default", "format": "dateTime"}
        return body, None

    if kind == "hyperlinkOrPicture":
        hp = col.get("hyperlinkOrPicture")
        body["hyperlinkOrPicture"] = hp if isinstance(hp, dict) else {"isPicture": False}
        return body, None

    if kind == "personOrGroup":
        pg = col.get("personOrGroup")
        body["personOrGroup"] = (
            pg
            if isinstance(pg, dict)
            else {"allowMultipleSelection": False, "displayAs": "default", "chooseFromType": "peopleOnly"}
        )
        return body, None

    if kind == "lookup":
        lu = col.get("lookup")
        if not isinstance(lu, dict):
            return None, "lookup_missing_definition"
        if col.get("readOnly") and lu.get("primaryLookupColumnId"):
            return None, "lookup_dependent_readonly"
        if not target_lookup_list_graph_id:
            return None, "lookup_target_list_unresolved"
        body["lookup"] = {
            "allowMultipleValues": bool(lu.get("allowMultipleValues", False)),
            "columnName": lu.get("columnName") or "ID",
            "listId": target_lookup_list_graph_id,
        }
        return body, None

    return None, f"unsupported_kind:{kind}"


def normalize_choices(choices: Any) -> frozenset[str]:
    if not isinstance(choices, list):
        return frozenset()
    return frozenset(str(x) for x in choices)


def schema_field_signature(col: dict[str, Any]) -> dict[str, Any]:
    """Comparable snapshot for schema diff."""
    kind = column_kind(col)
    sig: dict[str, Any] = {
        "name": col.get("name"),
        "displayName": col.get("displayName"),
        "kind": kind,
        "required": bool(col.get("required")),
        "readOnly": bool(col.get("readOnly")),
        "hidden": bool(col.get("hidden")),
    }
    if kind == "choice" and isinstance(col.get("choice"), dict):
        ch = col["choice"]
        sig["choice_allow_multiple"] = choice_allow_multiple_values(col)
        sig["choices"] = sorted(normalize_choices(ch.get("choices")))
    if kind == "lookup" and isinstance(col.get("lookup"), dict):
        lu = col["lookup"]
        sig["lookup_list_id_source"] = str(lu.get("listId") or "")
        sig["lookup_column_name"] = lu.get("columnName")
        sig["lookup_allow_multiple"] = bool(lu.get("allowMultipleValues"))
    if kind == "personOrGroup" and isinstance(col.get("personOrGroup"), dict):
        sig["person_allow_multiple"] = bool(col["personOrGroup"].get("allowMultipleSelection"))
    if kind == "number" and isinstance(col.get("number"), dict):
        sig["number_format"] = col["number"].get("displayAs")
    if kind == "dateTime" and isinstance(col.get("dateTime"), dict):
        sig["date_format"] = col["dateTime"].get("format")
    return sig


def safe_report_filename_segment(list_name: str) -> str:
    """Filesystem-safe segment for reports/schema_diff_<segment>.json."""
    s = (list_name or "list").strip()
    s = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", s)
    return s or "list"
