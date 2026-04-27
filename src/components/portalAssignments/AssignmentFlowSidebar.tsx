import * as React from "react";
import type {
	AssignmentStepItem,
	UserAssignmentItem,
} from "../../webparts/portalAssignments/types/AssignmentTypes";

export function AssignmentFlowSidebar({
  steps,
  activeOrder,
  setActiveOrder,
  persistProgress,
  pane,
  setPane,
  assignment,
  stepNavigationBlocked,
  hasQuiz,
  quizUnlocked,
  maxStepOrder,
}: {
  steps: AssignmentStepItem[];
  activeOrder: number;
  setActiveOrder: (order: number) => void;
  persistProgress: (order: number) => Promise<void>;
  pane: "step" | "quiz";
  setPane: (pane: "step" | "quiz") => void;
  assignment: UserAssignmentItem;
  stepNavigationBlocked: boolean;
  hasQuiz: boolean;
  quizUnlocked: boolean;
  maxStepOrder: number;
}): JSX.Element {
  return (
    <aside className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-3 py-2 text-xs font-semibold tracking-wide text-slate-600 uppercase">
        Steps
      </div>
      <ul className="p-2">
        {steps.map((s) => {
          const active = s.stepOrder === activeOrder;
          const viewed = (assignment.currentStepOrder ?? 0) >= s.stepOrder;
          const disabled =
            pane === "step" &&
            stepNavigationBlocked &&
            s.stepOrder !== activeOrder;
          return (
            <li key={s.id}>
              <button
                className={[
                  "w-full rounded-md px-2 py-2 text-left text-sm",
                  active ? "bg-blue-50 text-blue-900" : "text-slate-800 hover:bg-slate-50",
                  disabled ? "opacity-50 cursor-not-allowed hover:bg-transparent" : "",
                ].join(" ")}
                disabled={disabled}
                onClick={async () => {
                  setPane("step");
                  setActiveOrder(s.stepOrder);
                  await persistProgress(s.stepOrder);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {s.stepOrder}. {s.stepTitle ?? "Step"}
                    {typeof s.estimatedMinutes === "number" && s.estimatedMinutes > 0 ? (
                      <span className="text-xs text-slate-500">
                        &nbsp; ~{s.estimatedMinutes}min
                      </span>
                    ) : null}
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
        {hasQuiz ? (
          <li key="__quiz__" className="mt-1">
            <button
              className={[
                "w-full rounded-md px-2 py-2 text-left text-sm",
                pane === "quiz" ? "bg-purple-50 text-purple-900" : "text-slate-800 hover:bg-slate-50",
                !quizUnlocked ? "opacity-50 cursor-not-allowed hover:bg-transparent" : "",
              ].join(" ")}
              disabled={!quizUnlocked}
              onClick={() => setPane("quiz")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{maxStepOrder + 1}. Quiz</span>
                <span className="text-xs text-slate-400">{quizUnlocked ? "—" : "Locked"}</span>
              </div>
            </button>
          </li>
        ) : null}
      </ul>
    </aside>
  );
}

