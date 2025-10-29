import * as React from "react";

export function StatusPill({ status }: { status: string }): JSX.Element {
	const map: Record<string, string> = {
		Draft: "border-slate-300 bg-slate-50 text-slate-700",
		Scheduled: "border-amber-300 bg-amber-50 text-amber-800",
		Published: "border-green-300 bg-green-50 text-green-800",
		Archived: "border-slate-200 bg-slate-100 text-slate-600",
		Error: "border-red-300 bg-red-50 text-red-700",
	};
	const cls = map[status] || map.Draft;
	return (
		<span
			className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
		>
			{status}
		</span>
	);
}
