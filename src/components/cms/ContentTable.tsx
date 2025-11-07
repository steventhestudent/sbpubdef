// ────────────────────────────────────────────────────────────────────────────────
// Generic content table used by many managers
// ────────────────────────────────────────────────────────────────────────────────
import * as React from "react";
import type { ContentRow } from "@type/cms/ContentRow";
import { StatusPill } from "@components/cms/StatusPill";

export function ContentTable({
	kind,
	items,
	sites,
	query,
	selectionMode,
	selectedIds = [],
	onToggleSelect,
}: {
	kind: string;
	items: ContentRow[];
	sites: string[];
	query: string;
	selectionMode?: boolean;
	selectedIds?: string[];
	onToggleSelect?: (id: string) => void;
}): JSX.Element {
	return (
		<div className="overflow-x-auto">
			<table className="min-w-full divide-y divide-slate-200">
				<thead className="bg-slate-50">
					<tr>
						{selectionMode && <th className="w-10 px-3 py-2" />}
						{[
							"Title",
							"Type",
							"Dpt. Slug",
							"When",
							"Owner",
							"Status",
							"",
						].map((h) => (
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
					{items.map((it) => (
						<tr key={it.id} className="hover:bg-slate-50">
							{selectionMode && (
								<td className="px-3 py-3">
									<input
										type="checkbox"
										checked={selectedIds?.includes(it.id)}
										onChange={() =>
											onToggleSelect &&
											onToggleSelect(it.id)
										}
										aria-label={`Select ${it.title}`}
									/>
								</td>
							)}
							<td className="px-4 py-3 text-sm text-slate-800">
								<a
									href="#"
									className="text-blue-700 hover:underline"
								>
									{it.title}
								</a>
								<div className="text-xs text-slate-500">
									{it.subtitle}
								</div>
							</td>
							<td className="px-4 py-3 text-sm text-slate-700">
								{it.PDDeparment}
							</td>
							<td className="px-4 py-3 text-sm text-slate-700">
								{it.site}
							</td>
							<td className="px-4 py-3 text-sm text-slate-700">
								{it.when}
							</td>
							<td className="px-4 py-3 text-sm text-slate-700">
								{it.owner}
							</td>
							<td className="px-4 py-3">
								<StatusPill status={it.status} />
							</td>
							<td className="px-4 py-3 text-right text-sm">
								<a
									href="#"
									className="text-blue-700 hover:underline"
								>
									Edit
								</a>
							</td>
						</tr>
					))}
				</tbody>
			</table>
			<div className="mt-3 flex items-center justify-between text-sm text-slate-600">
				<div>
					Sites: {sites.join(", ") || "—"} | Filter: {query || "—"}
				</div>
				<div className="flex items-center gap-2">
					<button className="rounded-md border border-slate-300 px-2 py-1 hover:bg-white">
						Prev
					</button>
					<button className="rounded-md border border-slate-300 px-2 py-1 hover:bg-white">
						Next
					</button>
				</div>
			</div>
		</div>
	);
}
