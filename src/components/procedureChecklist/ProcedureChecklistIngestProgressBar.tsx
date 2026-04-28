import * as React from "react";

export function procedureIngestPhaseLabel(
	phase: string | undefined,
): string {
	switch (phase) {
		case "reading":
			return "Reading file…";
		case "encoding":
			return "Preparing PDF…";
		case "uploading":
			return "Uploading…";
		case "processing":
			return "Saving to SharePoint…";
		case "complete":
			return "Done";
		default:
			return "Working…";
	}
}

export function ProcedureChecklistIngestProgressBar({
	visible,
	percent,
	phase,
	error,
	onDismissError,
}: {
	/** Progress bar shown while true */
	visible: boolean;
	percent: number;
	phase?: string;
	error: string | null;
	onDismissError?: () => void;
}): JSX.Element | null {
	if (!visible && !error) return null;
	return (
		<div
			className="mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs shadow-sm"
			role="status"
			aria-live="polite"
		>
			{error ? (
				<div className="flex items-start justify-between gap-2 text-red-800">
					<span className="min-w-0 flex-1 break-words">{error}</span>
					{onDismissError ? (
						<button
							type="button"
							className="shrink-0 rounded px-1.5 py-0.5 text-red-800 underline hover:bg-red-50"
							onClick={onDismissError}
						>
							Dismiss
						</button>
					) : null}
				</div>
			) : null}
			{visible ? (
				<div className={error ? "mt-2" : ""}>
					<div className="mb-1 flex justify-between gap-2 text-slate-600">
						<span className="min-w-0 truncate">
							{procedureIngestPhaseLabel(phase)}
						</span>
						<span className="shrink-0 tabular-nums text-slate-800">
							{Math.round(Math.max(0, Math.min(100, percent)))}%
						</span>
					</div>
					<div className="h-2 overflow-hidden rounded-full bg-slate-200">
						<div
							className="h-full rounded-full bg-blue-600 transition-[width] duration-200 ease-out"
							style={{
								width: `${Math.max(0, Math.min(100, percent))}%`,
							}}
						/>
					</div>
				</div>
			) : null}
		</div>
	);
}
