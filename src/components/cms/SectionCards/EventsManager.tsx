import * as React from "react";
import type { PNPWrapper } from "@utils/PNPWrapper";
import { EventsApi } from "@api/events/EventsApi";
import type { PDEvent } from "@type/PDEvent";
import { SelectAllCheckbox } from "@components/cms/SelectAllCheckbox";

export function EventsManager({
	sites,
	query,
	selectionMode,
	selectedIds,
	onToggleSelect,
	onSelectAll,
	pnpWrapper,
}: {
	sites: string[];
	query: string;
	selectionMode: boolean;
	selectedIds: string[];
	onToggleSelect: (id: string) => void;
	onSelectAll: (ids: string[], select: boolean) => void;
	pnpWrapper: PNPWrapper;
}): JSX.Element {
	const [items, setItems] = React.useState<PDEvent[]>([]);
	const [limit, setLimit] = React.useState(50);
	const pageSize = 10;
	const [shown, setShown] = React.useState(pageSize);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | undefined>(undefined);

	const load = React.useCallback(async (): Promise<void> => {
		setLoading(true);
		setError(undefined);
		try {
			const api = new EventsApi(pnpWrapper);
			const rows = await api.get(limit);
			setItems(rows || []);
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : String(e);
			setError(msg || "Failed to load events.");
			setItems([]);
		} finally {
			setLoading(false);
		}
	}, [pnpWrapper, limit]);

	React.useEffect(() => {
		pnpWrapper.loadCachedThenFresh(load);
	}, [load]);

	React.useEffect(() => {
		setShown(pageSize);
	}, [query]);

	const filtered = query.trim()
		? items.filter((i) =>
				`${i.title} ${i.location ?? ""} ${i.PDDepartment ?? ""}`
					.toLowerCase()
					.includes(query.trim().toLowerCase()),
			)
		: items;

	const paged = React.useMemo(() => filtered.slice(0, shown), [filtered, shown]);

	const visibleIds = React.useMemo(
		() => paged.map((i) => String(i.id)),
		[paged],
	);
	const selectedVisibleCount = React.useMemo(() => {
		if (!selectionMode) return 0;
		const set = new Set(selectedIds);
		return visibleIds.reduce((acc, id) => (set.has(id) ? acc + 1 : acc), 0);
	}, [selectionMode, selectedIds, visibleIds]);
	const allSelected =
		selectionMode &&
		visibleIds.length > 0 &&
		selectedVisibleCount === visibleIds.length;
	const someSelected =
		selectionMode && selectedVisibleCount > 0 && !allSelected;

	return (
		<div className="space-y-3">
			{error ? (
				<div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
					{error}
				</div>
			) : null}

			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-slate-200">
					<thead className="bg-slate-50">
						<tr>
							{selectionMode && (
								<th className="w-10 px-3 py-2">
									<SelectAllCheckbox
										checked={Boolean(allSelected)}
										indeterminate={Boolean(someSelected)}
										onChange={(e) =>
											onSelectAll(
												visibleIds,
												e.target.checked,
											)
										}
										ariaLabel="Select all events"
									/>
								</th>
							)}
							{["ID", "Title", "Start", "Owner", "Location", "Department"].map((h) => (
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
						{paged.map((it) => {
							const d = it.date ? new Date(it.date) : undefined;
							const startLabel =
								d && !Number.isNaN(d.getTime())
									? d.toLocaleString()
									: "—";
							return (
								<tr key={String(it.id)} className="hover:bg-slate-50">
									{selectionMode && (
										<td className="px-3 py-3">
											<input
												type="checkbox"
												checked={selectedIds?.includes(String(it.id))}
												onChange={() => onToggleSelect(String(it.id))}
												aria-label={`Select ${it.title}`}
											/>
										</td>
									)}
									<td className="px-4 py-3 text-xs text-slate-600">
										#{String(it.id)}
									</td>
									<td className="px-4 py-3 text-sm text-slate-800">
										{it.detailsUrl ? (
											<a
												href={it.detailsUrl}
												className="text-blue-700 hover:underline"
												target="_blank"
												rel="noreferrer"
											>
												{it.title}
											</a>
										) : (
											it.title
										)}
									</td>
									<td className="px-4 py-3 text-sm text-slate-700">
										{startLabel}
									</td>
									<td className="px-4 py-3 text-sm text-slate-700">
										{it.author || "—"}
									</td>
									<td className="px-4 py-3 text-sm text-slate-700">
										{it.location || "—"}
									</td>
									<td className="px-4 py-3 text-sm text-slate-700">
										{it.PDDepartment || "—"}
									</td>
								</tr>
							);
						})}
						{!filtered.length && !loading ? (
							<tr>
								<td
									colSpan={selectionMode ? 7 : 6}
									className="px-4 py-6 text-sm text-slate-500"
								>
									No events found.
								</td>
							</tr>
						) : null}
					</tbody>
				</table>
			</div>

			<div className="flex items-center justify-end">
				<button
					className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-white disabled:opacity-50"
					onClick={() => {
						if (shown < filtered.length) {
							setShown((n) => n + pageSize);
						} else {
							setLimit((n) => n + 50);
						}
					}}
					disabled={loading}
				>
					{loading ? "Loading…" : "Load more"}
				</button>
			</div>
		</div>
	);
}
