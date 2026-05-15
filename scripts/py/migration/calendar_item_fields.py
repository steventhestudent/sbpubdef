"""
SharePoint Events (calendar) list item helpers for Graph import.

Graph list item create often drops or mishandles ``fAllDayEvent`` when it is not
modeled as a writable boolean in ``columns.json``. Without ``fAllDayEvent: true``,
``EventDate`` midnight UTC is shown as the previous calendar evening in US time zones.

See: https://github.com/SharePoint/sp-dev-docs/issues/2755
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from migration.field_transform import coerce_graph_bool, value_for_graph_field

logger = logging.getLogger(__name__)

_CALENDAR_BOOL_FIELDS = frozenset({"fAllDayEvent", "fRecurrence"})


def _coerce_calendar_flag(raw: Any) -> bool | None:
    if isinstance(raw, bool):
        return raw
    if isinstance(raw, (int, float)):
        if raw == 0:
            return False
        if raw == 1:
            return True
        return None
    return coerce_graph_bool(raw)


def merge_missing_allowed_fields(
    fields: dict[str, Any],
    raw_fields: dict[str, Any],
    allowed_keys: set[str],
    columns_by_name: dict[str, dict[str, Any]],
) -> None:
    """
    Copy allowed raw fields that were skipped because ``columns.json`` omits them.

    Calendar lists often omit ``fAllDayEvent`` / ``fRecurrence`` from the column export
    even though Graph accepts them on create.
    """
    for key in raw_fields:
        if key in fields or key not in allowed_keys:
            continue
        col = columns_by_name.get(key)
        if col is not None:
            val, _reason = value_for_graph_field(col, raw_fields[key])
            if val is not None:
                fields[key] = val
                continue
        if key in _CALENDAR_BOOL_FIELDS:
            b = _coerce_calendar_flag(raw_fields[key])
            if b is not None:
                fields[key] = b


def normalize_calendar_boolean_fields(fields: dict[str, Any]) -> None:
    """Force ``fAllDayEvent`` / ``fRecurrence`` to real booleans for Graph (not strings)."""
    for k in _CALENDAR_BOOL_FIELDS:
        if k not in fields:
            continue
        b = _coerce_calendar_flag(fields[k])
        if b is not None:
            fields[k] = b


def apply_graph_all_day_eventdate_plus_one(fields: dict[str, Any]) -> None:
    """
    Add one calendar day to ``EventDate`` on Graph create when ``fAllDayEvent`` is true.

    Graph often stores ``EventDate`` one calendar day earlier than the POST body for all-day
    items; +1 in the request compensates (https://github.com/SharePoint/sp-dev-docs/issues/2755).
    Default on; set ``MIGRATION_GRAPH_ALLDAY_EVENTDATE_PLUS_ONE=false`` to disable.
    """
    from migration import import_context as ctx

    if not ctx.migration_graph_all_day_eventdate_plus_one():
        return
    if fields.get("fAllDayEvent") is not True:
        return
    ev = fields.get("EventDate")
    if not isinstance(ev, str) or not ev.strip():
        return
    adjusted = _iso_datetime_add_days(ev, 1)
    if adjusted != ev:
        fields["EventDate"] = adjusted
        logger.debug("Graph all-day workaround: EventDate %r -> %r", ev, adjusted)


def _iso_datetime_add_days(iso: str, days: int) -> str:
    dt = _parse_iso_datetime(iso)
    if dt is None:
        return iso
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    dt2 = (dt + timedelta(days=days)).astimezone(timezone.utc)
    return dt2.strftime("%Y-%m-%dT%H:%M:%SZ")


def _parse_iso_datetime(s: str) -> datetime | None:
    s = s.strip()
    if not s:
        return None
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        return None
