"""
Step 7: Import list items from `list_items/*.jsonl` (two-pass: create, then patch lookups).

Requires:
  - import_reports/list_name_to_new_id.json from import_lists.py
  - reports/schema_diff_<list>.json from schema_diff.py (gates item import)
  - reports/list_import_order.json recommended (from list_import_order.py)

Writes:
  - state/item_id_map.json (source list item id -> target item id)
  - reports/item_import_failures_<list>.json
  - reports/unresolved_users.json
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path
from typing import Any

_SP = Path(__file__).resolve().parents[1]
if str(_SP) not in sys.path:
    sys.path.insert(0, str(_SP))

from azure_function.sbpubdef.local_upload import add_list_item

from migration import calendar_item_fields
from migration.column_schema import column_kind, safe_report_filename_segment
from migration.field_transform import value_for_graph_field
from migration.list_allowlist import effective_export_list_names
from migration.list_import_order import ordered_export_names
from migration import import_client
from migration import import_context as ctx
from migration import sp_client
from migration.schema_diff import load_item_import_ready

logger = logging.getLogger(__name__)


def _norm_source_list_id(s: str | None) -> str:
    return str(s or "").strip().strip("{}").lower()


def _acceptable_field_keys(site_id: str, list_id: str) -> set[str]:
    cols = sp_client.get_list_columns(site_id, list_id) or []
    allowed: set[str] = set()
    for c in cols:
        name = (c.get("name") or "").strip()
        if not name:
            continue
        allowed.add(name)
        if "lookup" in c or "personOrGroup" in c:
            allowed.add(f"{name}LookupId")
    allowed.discard("AuthorLookupId")
    allowed.discard("EditorLookupId")
    return allowed


def _load_export_columns_by_name(root: Path, export_path_rel: str) -> dict[str, dict[str, Any]]:
    p = root / export_path_rel / "columns.json"
    if not p.is_file():
        return {}
    cols = import_client.read_json(p)
    if not isinstance(cols, list):
        return {}
    out: dict[str, dict[str, Any]] = {}
    for c in cols:
        if isinstance(c, dict) and c.get("name"):
            out[str(c["name"]).strip()] = c
    return out


def _extract_lookup_source_id(raw_fields: dict[str, Any], col_name: str) -> str | None:
    k = f"{col_name}LookupId"
    v = raw_fields.get(k)
    if v is not None and v != "":
        return str(v).strip()
    direct = raw_fields.get(col_name)
    if isinstance(direct, dict):
        for key in ("lookupId", "LookupId", "id"):
            if direct.get(key) is not None:
                return str(direct[key]).strip()
    return None


def _extract_lookup_source_ids(raw_fields: dict[str, Any], col_name: str, *, multi: bool) -> list[str]:
    k = f"{col_name}LookupId"
    v = raw_fields.get(k)
    if multi:
        if isinstance(v, list):
            return [str(x).strip() for x in v if x is not None and str(x).strip()]
        if v is not None and str(v).strip():
            return [str(v).strip()]
        return []
    sid = _extract_lookup_source_id(raw_fields, col_name)
    return [sid] if sid else []


def _err_msg(res_or_exc: Any) -> str:
    if isinstance(res_or_exc, dict) and res_or_exc.get("error"):
        err = res_or_exc["error"]
        if isinstance(err, dict):
            return str(err.get("message") or err.get("code") or err)[:500]
        return str(err)[:500]
    return str(res_or_exc)[:500]


def _patch_item_fields(site_id: str, list_id: str, item_id: str | int, payload: dict[str, Any]) -> tuple[bool, str]:
    url = f"{sp_client.GRAPH_V1}/sites/{site_id}/lists/{list_id}/items/{item_id}/fields"
    r = sp_client.graph_patch(url, json_body=payload)
    if r.status_code < 300:
        return True, ""
    return False, r.text[:1200]


def _build_pass1_fields(
    raw_fields: dict[str, Any],
    columns_by_name: dict[str, dict[str, Any]],
    allowed_keys: set[str],
    *,
    export_list_name: str,
    unresolved_users: list[dict[str, Any]],
) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for _cname, col in columns_by_name.items():
        kind = column_kind(col)
        name = (col.get("name") or "").strip()
        if not name:
            continue
        if kind == "lookup":
            continue
        if kind == "personOrGroup":
            raw = raw_fields.get(name)
            if raw is not None:
                unresolved_users.append(
                    {
                        "list": export_list_name,
                        "field": name,
                        "sourceValue": {"raw": raw},
                        "reason": "person_field_not_resolved_per_policy",
                    }
                )
            continue
        raw = raw_fields.get(name)
        if raw is None:
            continue
        val, _reason = value_for_graph_field(col, raw)
        if val is None:
            continue
        if name not in allowed_keys:
            continue
        out[name] = val
    calendar_item_fields.merge_missing_allowed_fields(out, raw_fields, allowed_keys, columns_by_name)
    calendar_item_fields.normalize_calendar_boolean_fields(out)
    calendar_item_fields.apply_graph_all_day_eventdate_plus_one(out)
    return out


def run_import() -> dict[str, Any]:
    ctx.load_migration_target_env()
    sp_client.authenticate()
    dry = ctx.migration_dry_run()
    site_id = import_client.target_site_id()
    name_map = import_client.load_list_id_map()
    if not name_map:
        raise RuntimeError("Missing list_name_to_new_id.json — run import_lists.py first.")
    if any(v == "dry-run-not-created" for v in name_map.values()):
        report = {
            "skipped": True,
            "reason": "import_lists was run with MIGRATION_DRY_RUN=true — re-run without dry run before importing items.",
        }
        import_client.write_report("import_list_items", report)
        return report

    idx = import_client.read_json(import_client.lists_index_path())
    lists_meta = idx.get("lists") or []
    if ctx.migration_url_rewrite_enabled():
        src = ctx.migration_source_site_absolute_url()
        try:
            tgt = ctx.migration_target_site_absolute_url()
        except ValueError:
            tgt = None
        if src and tgt and src != tgt:
            logger.info("Field URL rewrite (source site prefix -> target): %s -> %s", src, tgt)
        elif not src:
            logger.info(
                "Field URL rewrite skipped (no source base URL; set MIGRATION_SOURCE_SITE_URL "
                "or export site/site.json via export_site.py)"
            )
    guid_to_name: dict[str, str] = {}
    for e in lists_meta:
        gid = _norm_source_list_id(str(e.get("id") or ""))
        n = (e.get("name") or "").strip()
        if gid and n:
            guid_to_name[gid] = n

    sort_order = ordered_export_names(lists_meta)
    pos = {n: i for i, n in enumerate(sort_order)}
    lists_sorted = sorted(lists_meta, key=lambda e: pos.get((e.get("name") or "").strip(), 10**9))
    allow = effective_export_list_names(lists_meta)
    if allow is not None:
        logger.info("MIGRATION_LIST_ALLOWLIST active: importing items for %s list(s).", len(allow))

    root = ctx.migration_export_root()
    item_map = import_client.load_item_id_map()
    item_map.setdefault("bySourceListId", {})

    unresolved_users: list[dict[str, Any]] = []
    field_transform_counts: dict[str, int] = {}
    global_counts = {
        "pass1Created": 0,
        "pass1Failed": 0,
        "pass2Patched": 0,
        "pass2Failed": 0,
        "listsSkipped": 0,
        "listsSchemaBlocked": 0,
    }

    for entry in lists_sorted:
        export_name = (entry.get("name") or "").strip()
        export_id = (entry.get("id") or "").strip()
        export_rel = (entry.get("exportPath") or "").strip()
        tmpl = (entry.get("listTemplate") or "").lower()
        disp = (entry.get("displayName") or export_name).strip()

        if not export_name or not export_id:
            continue
        if allow is not None and export_name not in allow:
            continue
        if export_name == "SitePages" or tmpl in ("sitepages", "sitepageslibrary", "webpagelibrary"):
            # Modern pages are handled by provision_pages.py (targeted) rather than list item import.
            global_counts["listsSkipped"] += 1
            continue
        if tmpl == "documentlibrary":
            global_counts["listsSkipped"] += 1
            continue

        list_id = name_map.get(export_name)
        if not list_id or list_id == "dry-run-not-created":
            global_counts["listsSkipped"] += 1
            continue

        jsonl = import_client.list_item_jsonl_for_export_list(export_name, export_id)
        if not jsonl or not jsonl.is_file():
            continue

        seg = safe_report_filename_segment(export_name)
        ready = load_item_import_ready(export_name)
        columns_by_name = _load_export_columns_by_name(root, export_rel)
        allowed_keys = _acceptable_field_keys(site_id, list_id)

        expected_rows = 0
        with open(jsonl, encoding="utf-8") as f:
            expected_rows = sum(1 for line in f if line.strip())

        pass1_failures: list[dict[str, Any]] = []
        pass2_failures: list[dict[str, Any]] = []
        dry_samples: list[dict[str, Any]] = []

        if not ready:
            global_counts["listsSchemaBlocked"] += 1
            fail_report = {
                "exportInternalName": export_name,
                "displayName": disp,
                "targetListId": list_id,
                "schemaGate": "blocked",
                "expectedRows": expected_rows,
                "pass1Failures": [{"reason": "itemImportReady=false_see_reports/schema_diff_%s.md" % seg}],
                "pass2Failures": [],
            }
            import_client.write_migration_reports_json(f"item_import_failures_{seg}", fail_report)
            logger.warning(
                "[%s] %s (target id=%s) SKIPPED: schema diff not ready (expected items=%s)",
                export_name,
                disp,
                list_id,
                expected_rows,
            )
            continue

        logger.info("[%s] importing items (expected=%s) ...", export_name, expected_rows)

        created_ok = 0
        failed_p1 = 0

        # Pass 1
        pass1_seen = 0
        with open(jsonl, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                pass1_seen += 1
                row = json.loads(line)
                raw_fields = import_client.fields_for_graph_create(row.get("fields") or {})
                # One-time legacy export transform(s): keep these at the import boundary only.
                # Old source exports may contain Assignments.Statuc (typo). Rebuilt target uses Assignments.Status.
                if export_name == "Assignments" and "Statuc" in raw_fields and "Status" not in raw_fields:
                    raw_fields["Status"] = raw_fields.get("Statuc")
                    field_transform_counts["Assignments.Statuc->Status"] = (
                        field_transform_counts.get("Assignments.Statuc->Status", 0) + 1
                    )
                src_list_id = _norm_source_list_id(row.get("listId") or export_id)
                src_item_id = str(row.get("itemId") or raw_fields.get("id") or "").strip()
                if not src_item_id:
                    failed_p1 += 1
                    pass1_failures.append({"reason": "missing_source_item_id", "row": row.get("webUrl")})
                    continue

                fields = _build_pass1_fields(
                    raw_fields,
                    columns_by_name,
                    allowed_keys,
                    export_list_name=export_name,
                    unresolved_users=unresolved_users,
                )

                if dry:
                    created_ok += 1
                    if len(dry_samples) < 3:
                        dry_samples.append({"pass": 1, "sourceItemId": src_item_id, "fields": fields})
                    continue

                try:
                    res = add_list_item(site_id, list_id, fields)
                    if isinstance(res, dict) and res.get("error"):
                        failed_p1 += 1
                        pass1_failures.append({"sourceItemId": src_item_id, "error": res})
                    else:
                        created_ok += 1
                        tgt_item_id = str(res.get("id") or "")
                        if tgt_item_id:
                            bucket = item_map["bySourceListId"].setdefault(src_list_id, {})
                            bucket[src_item_id] = tgt_item_id
                except Exception as e:
                    failed_p1 += 1
                    pass1_failures.append({"sourceItemId": src_item_id, "error": str(e)[:500]})

                if pass1_seen % 50 == 0:
                    logger.info(
                        "[%s] pass1 progress: seen=%s created=%s failed=%s",
                        export_name,
                        pass1_seen,
                        created_ok,
                        failed_p1,
                    )

        import_client.save_item_id_map(item_map)

        patched_ok = 0
        failed_p2 = 0

        # Pass 2 — lookups only
        lookup_cols = [
            c
            for c in columns_by_name.values()
            if column_kind(c) == "lookup"
            and not (c.get("readOnly") and (c.get("lookup") or {}).get("primaryLookupColumnId"))
        ]

        pass2_seen = 0
        with open(jsonl, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                pass2_seen += 1
                row = json.loads(line)
                raw_fields = import_client.fields_for_graph_create(row.get("fields") or {})
                if export_name == "Assignments" and "Statuc" in raw_fields and "Status" not in raw_fields:
                    raw_fields["Status"] = raw_fields.get("Statuc")
                src_list_id = _norm_source_list_id(row.get("listId") or export_id)
                src_item_id = str(row.get("itemId") or raw_fields.get("id") or "").strip()
                if not src_item_id:
                    continue

                tgt_item_id = item_map["bySourceListId"].get(src_list_id, {}).get(src_item_id)
                if not tgt_item_id:
                    continue

                patch: dict[str, Any] = {}
                for col in lookup_cols:
                    fname = (col.get("name") or "").strip()
                    if not fname:
                        continue
                    lu = col.get("lookup") or {}
                    multi = bool(lu.get("allowMultipleValues"))
                    src_lids = _extract_lookup_source_ids(raw_fields, fname, multi=multi)
                    if not src_lids:
                        continue
                    src_lookup_list = _norm_source_list_id(str(lu.get("listId") or ""))
                    bucket = item_map["bySourceListId"].get(src_lookup_list, {})

                    if multi:
                        tgt_ids: list[int] = []
                        missing_multi = False
                        for sid in src_lids:
                            tid = bucket.get(sid)
                            if not tid:
                                missing_multi = True
                                break
                            try:
                                tgt_ids.append(int(tid))
                            except ValueError:
                                try:
                                    tgt_ids.append(int(str(tid)))
                                except ValueError:
                                    missing_multi = True
                                    break
                        if missing_multi:
                            pass2_failures.append(
                                {
                                    "sourceItemId": src_item_id,
                                    "field": fname,
                                    "reason": "lookup_target_not_imported_multi",
                                    "sourceLookupIds": src_lids,
                                    "sourceLookupListKey": src_lookup_list,
                                }
                            )
                        elif tgt_ids:
                            patch[f"{fname}LookupId"] = tgt_ids
                    else:
                        tid = bucket.get(src_lids[0])
                        if tid:
                            try:
                                patch[f"{fname}LookupId"] = int(tid)
                            except ValueError:
                                patch[f"{fname}LookupId"] = int(str(tid))
                        else:
                            pass2_failures.append(
                                {
                                    "sourceItemId": src_item_id,
                                    "field": fname,
                                    "reason": "lookup_target_not_imported",
                                    "sourceLookupId": src_lids[0],
                                    "sourceLookupListKey": src_lookup_list,
                                }
                            )

                if not patch:
                    continue

                if dry:
                    patched_ok += 1
                    if len(dry_samples) < 5:
                        dry_samples.append({"pass": 2, "sourceItemId": src_item_id, "patch": patch})
                    continue

                ok, txt = _patch_item_fields(site_id, list_id, tgt_item_id, patch)
                if ok:
                    patched_ok += 1
                else:
                    failed_p2 += 1
                    pass2_failures.append(
                        {"sourceItemId": src_item_id, "targetItemId": tgt_item_id, "patch": patch, "error": txt[:500]}
                    )

                if (patched_ok + failed_p2) % 50 == 0:
                    logger.info(
                        "[%s] pass2 progress: patched=%s failed=%s (seen=%s)",
                        export_name,
                        patched_ok,
                        failed_p2,
                        pass2_seen,
                    )

        global_counts["pass1Created"] += created_ok
        global_counts["pass1Failed"] += failed_p1
        global_counts["pass2Patched"] += patched_ok
        global_counts["pass2Failed"] += failed_p2

        fail_report = {
            "exportInternalName": export_name,
            "displayName": disp,
            "targetListId": list_id,
            "schemaGate": "ok",
            "dryRun": dry,
            "expectedRows": expected_rows,
            "pass1Created": created_ok,
            "pass1Failed": failed_p1,
            "pass2Patched": patched_ok,
            "pass2Failed": failed_p2,
            "pass1Failures": pass1_failures[:500],
            "pass2Failures": pass2_failures[:500],
            "dryRunSamples": dry_samples,
        }
        import_client.write_migration_reports_json(f"item_import_failures_{seg}", fail_report)

        fr_msgs: list[str] = []
        for x in pass1_failures[:10]:
            if x.get("error"):
                fr_msgs.append(_err_msg(x.get("error")))
            elif x.get("reason"):
                fr_msgs.append(str(x["reason"]))
            if len(fr_msgs) >= 3:
                break
        if not fr_msgs:
            for x in pass2_failures[:10]:
                fr_msgs.append(str(x.get("reason") or x.get("error") or "")[:200])
                if len(fr_msgs) >= 3:
                    break
        logger.info(
            "[%s] %s (target id=%s)\n"
            "  fields expected: %s  (lookup cols deferred to pass 2: %s)\n"
            "  items expected: %s  pass1 created: %s  pass1 failed: %s\n"
            "  pass2 patched: %s  pass2 failed: %s\n"
            "  first failures: %s",
            export_name,
            disp,
            list_id,
            len(columns_by_name),
            len(lookup_cols),
            expected_rows,
            created_ok,
            failed_p1,
            patched_ok,
            failed_p2,
            " | ".join(fr_msgs) if fr_msgs else "(none)",
        )

    import_client.write_migration_reports_json(
        "unresolved_users",
        {"items": unresolved_users[:5000], "total": len(unresolved_users)},
    )
    if field_transform_counts:
        import_client.write_migration_reports_json(
            "field_transform_report",
            {
                "transforms": [
                    {
                        "sourceList": "Assignments",
                        "sourceField": "Statuc",
                        "targetField": "Status",
                        "reason": "legacy typo corrected during rebuild",
                        "appliedCount": field_transform_counts.get("Assignments.Statuc->Status", 0),
                    }
                ],
                "counts": field_transform_counts,
            },
        )

    summary = {
        "dryRun": dry,
        **global_counts,
        "unresolvedUsersReported": len(unresolved_users),
        "fieldTransformCounts": field_transform_counts,
        "errorCount": global_counts["pass1Failed"]
        + global_counts["pass2Failed"]
        + global_counts["listsSchemaBlocked"],
    }
    import_client.write_report("import_list_items", summary)
    return summary


def main() -> None:
    import os

    if "--dry-run" in sys.argv:
        os.environ["MIGRATION_DRY_RUN"] = "true"
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    r = run_import()
    print(
        f"import_list_items: pass1Created={r.get('pass1Created')} pass1Failed={r.get('pass1Failed')} "
        f"pass2Patched={r.get('pass2Patched')} pass2Failed={r.get('pass2Failed')} dryRun={r.get('dryRun')}"
    )


if __name__ == "__main__":
    main()
