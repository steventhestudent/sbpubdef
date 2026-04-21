import * as React from "react";
import type { IPortalAssignmentsProps } from "./IPortalAssignmentsProps";
import type { UserAssignmentItem } from "../types/AssignmentTypes";

function asDateLabel(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function isOverdue(item: UserAssignmentItem): boolean {
  if (String(item.status || "").toLowerCase() === "completed") return false;
  if (!item.dueDate) return false;
  const d = new Date(item.dueDate);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

type NormalizedStatus = "Not Started" | "In Progress" | "Completed" | "Overdue";

function normalizedStatus(item: UserAssignmentItem): NormalizedStatus {
  const raw = String(item.status || "").trim().toLowerCase();
  if (raw === "completed") return "Completed";
  if (isOverdue(item) || raw === "overdue") return "Overdue";
  if (raw === "in progress") return "In Progress";
  if (raw === "not started") return "Not Started";
  // fallbacks
  const pct = item.percentComplete ?? 0;
  const step = item.currentStepOrder ?? 0;
  if (pct > 0 || step > 0) return "In Progress";
  return "Not Started";
}

function statusPillClasses(s: NormalizedStatus): string {
  switch (s) {
    case "Completed":
      return "bg-green-50 text-green-800";
    case "Overdue":
      return "bg-red-50 text-red-800";
    case "In Progress":
      return "bg-blue-50 text-blue-800";
    case "Not Started":
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function progressBarClasses(s: NormalizedStatus): string {
  switch (s) {
    case "Completed":
      return "bg-green-600";
    case "Overdue":
      return "bg-red-600";
    case "In Progress":
      return "bg-blue-600";
    case "Not Started":
    default:
      return "bg-slate-400";
  }
}

export function AssignmentsCenter({
  ctx,
  email,
  items,
  loading,
  error,
  isAdmin,
  openHrefForId,
  assignmentsListTitle,
}: {
  ctx: IPortalAssignmentsProps["context"];
  email: string;
  items: UserAssignmentItem[];
  loading: boolean;
  error?: string;
  isAdmin: boolean;
  openHrefForId: (id: number) => string;
  assignmentsListTitle: string;
}): JSX.Element {
  const webRel = ctx.pageContext.web.serverRelativeUrl || "";
  const listUrl = `${window.location.origin}${webRel}/Lists/${assignmentsListTitle}/AllItems.aspx`;
  const catalogUrl = `${window.location.origin}${webRel}/Lists/${ENV.LIST_ASSIGNMENTCATALOG || "AssignmentCatalog"}/AllItems.aspx`;
  const stepsUrl = `${window.location.origin}${webRel}/Lists/${ENV.LIST_ASSIGNMENTSTEPS || "AssignmentSteps"}/AllItems.aspx`;

  const counts = React.useMemo(() => {
    const c: Record<NormalizedStatus, number> = {
      "Not Started": 0,
      "In Progress": 0,
      Completed: 0,
      Overdue: 0,
    };
    for (const it of items) c[normalizedStatus(it)] += 1;
    return c;
  }, [items]);

  return (
    <div className="p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-2xl font-semibold text-slate-900">Assignments Center</div>
          <div className="mt-1 text-sm text-slate-600">
            Signed in as <span className="font-medium text-slate-800">{email || "—"}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full px-2 py-1 ${statusPillClasses("Not Started")}`}>
              Not Started: <span className="font-semibold">{counts["Not Started"]}</span>
            </span>
            <span className={`rounded-full px-2 py-1 ${statusPillClasses("In Progress")}`}>
              In Progress: <span className="font-semibold">{counts["In Progress"]}</span>
            </span>
            <span className={`rounded-full px-2 py-1 ${statusPillClasses("Overdue")}`}>
              Overdue: <span className="font-semibold">{counts.Overdue}</span>
            </span>
            <span className={`rounded-full px-2 py-1 ${statusPillClasses("Completed")}`}>
              Completed: <span className="font-semibold">{counts.Completed}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin ? (
            <>
              <a className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" href={catalogUrl} target="_blank" rel="noreferrer">
                Catalog
              </a>
              <a className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" href={stepsUrl} target="_blank" rel="noreferrer">
                Steps
              </a>
              <a className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" href={listUrl} target="_blank" rel="noreferrer">
                Assignments list
              </a>
            </>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 text-sm text-slate-600">Loading assignments…</div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No assignments found.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {items.map((a) => {
            const s = normalizedStatus(a);
            const progress = Math.max(0, Math.min(100, a.percentComplete ?? 0));
            return (
              <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-slate-900">{a.title}</div>
                    {a.reason ? (
                      <div className="mt-1 line-clamp-2 text-sm text-slate-600">{a.reason}</div>
                    ) : null}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${statusPillClasses(s)}`}>
                    {s}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2 py-1">
                    Due <span className="font-semibold text-slate-800">{asDateLabel(a.dueDate)}</span>
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">
                    Status <span className="font-semibold text-slate-800">{s}</span>
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">
                    Progress <span className="font-semibold text-slate-800">{progress}%</span>
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${progressBarClasses(s)}`}
                      style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                    />
                  </div>
                  <a
                    className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    href={openHrefForId(Number(a.id))}
                  >
                    Open
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

