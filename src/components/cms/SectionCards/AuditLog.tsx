import * as React from "react";

export function AuditLog(): JSX.Element {
	const rows = Array.from({ length: 7 }).map((_, i) => ({
		id: `AUD-${i + 1}`,
		title: `Edited item ${i + 1}`,
		site: "/sites/PD-Intranet",
		when: "Today 10:2" + i,
		owner: "you@county.gov",
		status: "Saved",
	}));
	return (
		<div className="overflow-x-auto">
			<table className="min-w-full divide-y divide-slate-200">
				<thead className="bg-slate-50">
					<tr>
						{["Action", "Dpt. (slug)", "When", "By"].map((h) => (
							<th
								key={h}
								className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
							>
								{h}
							</th>
						))}
					</tr>
				</thead>
				<tbody className="divide-y divide-slate-200">
					{rows.map((r) => (
						<tr key={r.id} className="hover:bg-slate-50">
							<td className="px-4 py-3 text-sm text-slate-800">
								{r.title}
							</td>
							<td className="px-4 py-3 text-sm text-slate-700">
								{r.site}
							</td>
							<td className="px-4 py-3 text-sm text-slate-700">
								{r.when}
							</td>
							<td className="px-4 py-3 text-sm text-slate-700">
								{r.owner}
							</td>
						</tr>
					))}
				</tbody>
			</table>
			<p className="mt-2 text-xs text-slate-500">
				<em>
					Placeholder: show who did what, when. Later: filter by
					user/date/site.
				</em>
			</p>
		</div>
	);
}
