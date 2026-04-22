import * as React from "react";
import type { AssignmentsSpService } from "../services/AssignmentsSpService";
import type {
  AssignmentMutationResult,
  AssignmentsMutationsApi,
} from "../services/AssignmentsMutationsApi";
import type {
  AssignmentCatalogItem,
  AssignmentStepItem,
  UserAssignmentItem,
} from "../types/AssignmentTypes";
import { EmbedPlayer } from "./EmbedPlayer";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function asDateLabel(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function mergeAssignment(
  prev: UserAssignmentItem,
  patch: AssignmentMutationResult,
): UserAssignmentItem {
  return {
    ...prev,
    id: patch.id,
    currentStepOrder: patch.currentStepOrder ?? prev.currentStepOrder,
    percentComplete: patch.percentComplete ?? prev.percentComplete,
    status: (patch.status as UserAssignmentItem["status"]) ?? prev.status,
    lastOpenedOn: patch.lastOpenedOn ?? prev.lastOpenedOn,
    completedOn: patch.completedOn ?? prev.completedOn,
    finalEmbedCompleted: patch.finalEmbedCompleted ?? prev.finalEmbedCompleted,
  };
}

export function AssignmentFlow({
  svc,
  mutations,
  assignment,
  onBack,
  onUpdated,
}: {
  svc: AssignmentsSpService;
  mutations: AssignmentsMutationsApi;
  assignment: UserAssignmentItem;
  onBack: () => void;
  onUpdated: (next: UserAssignmentItem) => void;
}): JSX.Element {
  const [catalog, setCatalog] = React.useState<AssignmentCatalogItem | undefined>(undefined);
  const [steps, setSteps] = React.useState<AssignmentStepItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | undefined>(undefined);

  const [activeOrder, setActiveOrder] = React.useState<number>(assignment.currentStepOrder ?? 1);
  const [finalEmbedDone, setFinalEmbedDone] = React.useState<boolean>(
    assignment.finalEmbedCompleted === true,
  );
  const [saving, setSaving] = React.useState(false);
  const startedForId = React.useRef<number | null>(null);

  React.useEffect(() => {
    setFinalEmbedDone(assignment.finalEmbedCompleted === true);
  }, [assignment.id, assignment.finalEmbedCompleted]);

  React.useEffect(() => {
    let cancelled = false;
    (async (): Promise<void> => {
      setLoading(true);
      setErr(undefined);
      try {
        if (!assignment.assignmentCatalogId) throw new Error("AssignmentCatalogId missing on assignment item.");
        const [c, s] = await Promise.all([
          svc.getCatalogItemById(assignment.assignmentCatalogId),
          svc.getStepsForCatalog(assignment.assignmentCatalogId),
        ]);
        if (cancelled) return;
        setCatalog(c);
        setSteps(s);
        const maxOrder = s.length ? Math.max(...s.map((x) => x.stepOrder)) : 1;
        setActiveOrder(clamp(assignment.currentStepOrder ?? 1, 1, maxOrder));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load assignment.";
        setErr(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment.id]);

  React.useEffect(() => {
    if (loading || !catalog || !assignment.id) return;
    if (String(assignment.status || "").toLowerCase() === "completed") return;
    if (startedForId.current === assignment.id) return;
    startedForId.current = assignment.id;
    (async (): Promise<void> => {
      try {
        const patch = await mutations.start(assignment.id);
        onUpdated(mergeAssignment(assignment, patch));
      } catch (e: unknown) {
        startedForId.current = null;
        const msg = e instanceof Error ? e.message : "Failed to record assignment start.";
        setErr(msg);
      }
    })().catch(() => undefined);
  }, [assignment, catalog, loading, mutations, onUpdated]);

  const stepByOrder = React.useMemo(() => {
    const map = new Map<number, AssignmentStepItem>();
    for (const s of steps) map.set(s.stepOrder, s);
    return map;
  }, [steps]);

  const maxStepOrder = React.useMemo(() => {
    return steps.length ? Math.max(...steps.map((s) => s.stepOrder)) : 1;
  }, [steps]);

  const activeStep = stepByOrder.get(activeOrder);
  const isFinalStep = activeOrder === maxStepOrder;

  const requiresFinalEmbed =
    (catalog?.finalStepCompletionMode ?? "").toLowerCase().includes("require") ||
    (activeStep?.requireEmbedCompletion && isFinalStep);

  const canMarkComplete =
    isFinalStep &&
    (activeStep?.allowMarkCompleteHere ?? true) &&
    (!requiresFinalEmbed || finalEmbedDone);

  async function persistProgress(nextOrder: number): Promise<void> {
    if (!assignment.id) return;
    setSaving(true);
    try {
      const patch = await mutations.progress(assignment.id, nextOrder);
      onUpdated(mergeAssignment(assignment, patch));
    } finally {
      setSaving(false);
    }
  }

  async function persistFinalEmbedDone(): Promise<void> {
    if (finalEmbedDone) return;
    setSaving(true);
    try {
      const patch = await mutations.finalEmbed(assignment.id);
      setFinalEmbedDone(true);
      onUpdated(mergeAssignment(assignment, patch));
    } finally {
      setSaving(false);
    }
  }

  async function markComplete(): Promise<void> {
    if (!canMarkComplete) return;
    setSaving(true);
    try {
      const patch = await mutations.complete(assignment.id);
      onUpdated(mergeAssignment(assignment, patch));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <button className="text-sm text-blue-700 hover:underline" onClick={onBack}>
          ← Back
        </button>
        <div className="mt-3 text-sm text-slate-600">Loading assignment…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-4">
        <button className="text-sm text-blue-700 hover:underline" onClick={onBack}>
          ← Back
        </button>
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button className="text-sm text-blue-700 hover:underline" onClick={onBack}>
            ← Back
          </button>
          <div className="mt-2 text-lg font-semibold text-slate-900">
            {catalog?.title ?? assignment.title}
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Due {asDateLabel(assignment.dueDate)} • Status{" "}
            <span className="font-medium text-slate-800">{assignment.status ?? "—"}</span>
            {saving ? <span className="ml-2 text-xs text-slate-500">Saving…</span> : null}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Progress</div>
          <div className="text-sm font-semibold text-slate-800">
            {assignment.percentComplete ?? 0}%
          </div>
        </div>
      </div>

      {catalog?.instructions ? (
        <div
          className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 prose max-w-none"
          dangerouslySetInnerHTML={{ __html: catalog.instructions }}
        />
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[240px_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Steps
          </div>
          <ul className="p-2">
            {steps.map((s) => {
              const active = s.stepOrder === activeOrder;
              const viewed = (assignment.currentStepOrder ?? 0) >= s.stepOrder;
              return (
                <li key={s.id}>
                  <button
                    className={[
                      "w-full rounded-md px-2 py-2 text-left text-sm",
                      active ? "bg-blue-50 text-blue-900" : "hover:bg-slate-50 text-slate-800",
                    ].join(" ")}
                    onClick={async () => {
                      setActiveOrder(s.stepOrder);
                      await persistProgress(s.stepOrder);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {s.stepOrder}. {s.stepTitle ?? "Step"}
                      </span>
                      {viewed ? (
                        <span className="text-xs text-slate-500">Viewed</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <main className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-base font-semibold text-slate-900">
              {activeStep?.stepTitle ?? "Step"}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                disabled={activeOrder <= 1}
                onClick={async () => {
                  const next = clamp(activeOrder - 1, 1, maxStepOrder);
                  setActiveOrder(next);
                  await persistProgress(next);
                }}
              >
                Prev
              </button>
              <button
                className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                disabled={activeOrder >= maxStepOrder}
                onClick={async () => {
                  const next = clamp(activeOrder + 1, 1, maxStepOrder);
                  setActiveOrder(next);
                  await persistProgress(next);
                }}
              >
                Next
              </button>
            </div>
          </div>

          {activeStep?.bodyHtml ? (
            <div
              className="mt-3 text-sm text-slate-800 prose max-w-none"
              dangerouslySetInnerHTML={{ __html: activeStep.bodyHtml }}
            />
          ) : (
            <div className="mt-3 text-sm text-slate-500 italic">No content for this step.</div>
          )}

          {activeStep?.embedUrls?.length ? (
            <div className="mt-4 space-y-4">
              {activeStep.embedUrls.map((u, idx) => (
                <EmbedPlayer
                  key={idx}
                  url={u}
                  title={`Embed ${idx + 1}`}
                  onCompleted={() => {
                    if (isFinalStep && requiresFinalEmbed) {
                      persistFinalEmbedDone().catch(() => undefined);
                    }
                  }}
                />
              ))}
              {isFinalStep && requiresFinalEmbed && !finalEmbedDone ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Finish the final embed to unlock <span className="font-semibold">Mark Complete</span>.
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
            <div className="text-xs text-slate-500">
              Step {activeOrder} of {maxStepOrder}
            </div>
            <button
              className={[
                "rounded-md px-3 py-2 text-sm font-semibold",
                canMarkComplete
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-slate-200 text-slate-500 cursor-not-allowed",
              ].join(" ")}
              disabled={!canMarkComplete}
              onClick={() => {
                markComplete().catch(() => undefined);
              }}
            >
              Mark Complete
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
