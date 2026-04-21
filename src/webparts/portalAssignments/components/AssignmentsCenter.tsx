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

  const overdue = items.filter((i) => isOverdue(i) || String(i.status || "").toLowerCase() === "overdue");
  const active = items.filter((i) => String(i.status || "").toLowerCase() !== "completed");
  const completed = items.filter((i) => String(i.status || "").toLowerCase() === "completed");

  return (
    <div className="p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-2xl font-semibold text-slate-900">Assignments Center</div>
          <div className="mt-1 text-sm text-slate-600">
            Signed in as <span className="font-medium text-slate-800">{email || "—"}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
              Active: <span className="font-semibold">{active.length}</span>
            </span>
            <span className="rounded-full bg-red-50 px-2 py-1 text-red-800">
              Overdue: <span className="font-semibold">{overdue.length}</span>
            </span>
            <span className="rounded-full bg-green-50 px-2 py-1 text-green-800">
              Completed: <span className="font-semibold">{completed.length}</span>
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
            const overdueFlag = isOverdue(a) || String(a.status || "").toLowerCase() === "overdue";
            const progress = a.percentComplete ?? 0;
            return (
              <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-slate-900">{a.title}</div>
                    {a.reason ? (
                      <div className="mt-1 line-clamp-2 text-sm text-slate-600">{a.reason}</div>
                    ) : null}
                  </div>
                  {overdueFlag ? (
                    <span className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-800">
                      Overdue
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2 py-1">
                    Due <span className="font-semibold text-slate-800">{asDateLabel(a.dueDate)}</span>
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">
                    Status <span className="font-semibold text-slate-800">{a.status ?? "—"}</span>
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">
                    Progress <span className="font-semibold text-slate-800">{progress}%</span>
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600"
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

