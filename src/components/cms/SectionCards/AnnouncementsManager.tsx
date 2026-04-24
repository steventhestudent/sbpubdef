import * as React from "react";
import { AnnouncementsApi } from "@api/announcements";
import { PDAnnouncement } from "@type/PDAnnouncement";
import { SelectAllCheckbox } from "@components/cms/SelectAllCheckbox";

type AnnRow = {
	id: string;
	title: string;
	site: string;
	when: string;
	owner: string;
	status: string;
	url: string;
};

export function AnnouncementsManager({
	sites,
	query,
	selectionMode,
	selectedIds,
	onToggleSelect,
	onSelectAll,
	announcementsApi,
}: {
	sites: string[];
	query: string;
	selectionMode: boolean;
	selectedIds: string[];
	onToggleSelect: (id: string) => void;
	onSelectAll: (ids: string[], select: boolean) => void;
	announcementsApi: AnnouncementsApi;
}): JSX.Element {
	const [items, setItems] = React.useState<AnnRow[]>([]);
	const [limit, setLimit] = React.useState(12);
	const [loading, setLoading] = React.useState(false);

	async function load(): Promise<void> {
		setLoading(true);
		try {
			const data = await announcementsApi.get(limit);
			const rows = (data || []).map((el: PDAnnouncement, i: number) => {
				const when = el.published
					? el.published.toLocaleDateString()
					: "—";
				return {
					id: `${i + 1}`,
					title: el.title,
					site: el.siteUrl ?? "",
					when,
					owner: el.author || "—",
					status: el.published ? "Published" : "Draft",
					url: el.url,
				} satisfies AnnRow;
			});
			setItems(rows);
		} finally {
			setLoading(false);
		}
	}
	React.useEffect(() => {
		announcementsApi.pnpWrapper.loadCachedThenFresh(load); // pnpWrapper.cacheVal is "true" <--- not bool: true (subsequent req's are not cached)
	}, [limit]);

	const visibleIds = React.useMemo(() => items.map((i) => i.id), [items]);
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
										ariaLabel="Select all announcements"
									/>
								</th>
							)}
							{[
								"#",
								"Title",
								"When",
								"Owner",
								"Site",
								"Status",
							].map((h) => (
								<th
									key={h}
									className="px-4 py-2 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase"
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
											checked={selectedIds?.includes(
												it.id,
											)}
											onChange={() =>
												onToggleSelect(it.id)
											}
											aria-label={`Select ${it.title}`}
										/>
									</td>
								)}
								<td className="px-4 py-3 text-xs text-slate-600">
									{it.id}
								</td>
								<td className="px-4 py-3 text-sm text-slate-800">
									<a
										href={it.url}
										className="text-blue-700 hover:underline"
										target="_blank"
										rel="noreferrer"
									>
										{it.title}
									</a>
								</td>
								<td className="px-4 py-3 text-sm text-slate-700">
									{it.when}
								</td>
								<td className="px-4 py-3 text-sm text-slate-700">
									{it.owner}
								</td>
								<td className="px-4 py-3 text-xs text-slate-600">
									{it.site || "—"}
								</td>
								<td className="px-4 py-3 text-sm text-slate-700">
									{it.status}
								</td>
							</tr>
						))}
						{!items.length && !loading ? (
							<tr>
								<td
									colSpan={selectionMode ? 7 : 6}
									className="px-4 py-6 text-sm text-slate-500"
								>
									No announcements found.
								</td>
							</tr>
						) : null}
					</tbody>
				</table>
			</div>

			<div className="flex items-center justify-between">
				<div className="text-xs text-slate-500">
					Sites: {sites.join(", ") || "—"} | Filter: {query || "—"}
				</div>
				<div className="flex items-center gap-2">
					<button
						className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-white disabled:opacity-50"
						onClick={() => setLimit((n) => n + 12)}
						disabled={loading}
					>
						{loading ? "Loading…" : "Load more"}
					</button>
				</div>
			</div>
		</div>
	);
}
