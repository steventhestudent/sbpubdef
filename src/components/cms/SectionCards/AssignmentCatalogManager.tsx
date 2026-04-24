import * as React from "react";
import "@pnp/sp/items";
import type { PNPWrapper } from "@utils/PNPWrapper";
import { SelectAllCheckbox } from "@components/cms/SelectAllCheckbox";

type CatalogRow = {
	id: number;
	title: string;
	assignmentKey?: string;
	category?: string;
	active?: boolean;
	displayOrder?: number;
	contentVersion?: string | number;
};

export function AssignmentCatalogManager({
	query,
	selectionMode,
	selectedIds,
	onToggleSelect,
	onSelectAll,
	pnpWrapper,
}: {
	query: string;
	selectionMode: boolean;
	selectedIds: string[];
	onToggleSelect: (id: string) => void;
	onSelectAll: (ids: string[], select: boolean) => void;
	pnpWrapper: PNPWrapper;
}): JSX.Element {
	const [items, setItems] = React.useState<CatalogRow[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [hasMore, setHasMore] = React.useState(true);
	const pageSize = 25;

	type ItemsBatch = Array<Record<string, unknown>>;
	type ItemsIterator = AsyncIterator<ItemsBatch>;
	const iteratorRef = React.useRef<ItemsIterator | null>(null);
	type CatalogRawRow = {
		Id?: unknown;
		Title?: unknown;
		AssignmentKey?: unknown;
		Category?: unknown;
		Active?: unknown;
		DisplayOrder?: unknown;
		[key: string]: unknown;
	};

	async function load(reset = false): Promise<void> {
		setLoading(true);
		try {
			const web = pnpWrapper.web();
			const base = web.lists
				.getByTitle(ENV.LIST_ASSIGNMENTCATALOG)
				.items.select(
					"Id",
					"Title",
					"AssignmentKey",
					"Category",
					"Active",
					"DisplayOrder",
					ENV.INTERNALCOLUMN_CONTENTVERSION,
				)
				.orderBy("DisplayOrder", true)
				.top(pageSize);

			if (reset || !iteratorRef.current) {
				const iterable = base as unknown as AsyncIterable<ItemsBatch>;
				iteratorRef.current = iterable[Symbol.asyncIterator]();
				setHasMore(true);
			}

			const next = await iteratorRef.current.next();
			const rows = next.value || [];
			setHasMore(!Boolean(next.done));

			const mapped: CatalogRow[] = (rows || []).map(
				(raw: Record<string, unknown>) => {
					const r = raw as CatalogRawRow;
					return {
						id: Number(r.Id),
						title: String(r.Title || "(untitled)"),
						assignmentKey:
							typeof r.AssignmentKey === "string"
								? r.AssignmentKey
								: undefined,
						category:
							typeof r.Category === "string"
								? r.Category
								: undefined,
						active:
							typeof r.Active === "boolean"
								? r.Active
								: typeof r.Active === "number"
									? r.Active !== 0
									: undefined,
						displayOrder:
							typeof r.DisplayOrder === "number"
								? r.DisplayOrder
								: undefined,
						contentVersion:
							typeof r[ENV.INTERNALCOLUMN_CONTENTVERSION] ===
								"string" ||
							typeof r[ENV.INTERNALCOLUMN_CONTENTVERSION] ===
								"number"
								? (r[ENV.INTERNALCOLUMN_CONTENTVERSION] as
										| string
										| number)
								: undefined,
					} satisfies CatalogRow;
				},
			);

			setItems((prev) => (reset ? mapped : [...prev, ...mapped]));
		} finally {
			setLoading(false);
		}
	}

	React.useEffect(() => {
		load(true).catch(() => {});
	}, []);

	const filtered = query.trim()
		? items.filter((i) =>
				`${i.title} ${i.assignmentKey ?? ""} ${i.category ?? ""}`
					.toLowerCase()
					.includes(query.trim().toLowerCase()),
			)
		: items;

	const visibleIds = React.useMemo(
		() => filtered.map((i) => String(i.id)),
		[filtered],
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
										ariaLabel="Select all catalog items"
									/>
								</th>
							)}
							{[
								"Title",
								"Key",
								"Category",
								"Active",
								"Order",
								"Version",
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
						{filtered.map((it) => (
							<tr key={it.id} className="hover:bg-slate-50">
								{selectionMode && (
									<td className="px-3 py-3">
										<input
											type="checkbox"
											checked={selectedIds?.includes(
												String(it.id),
											)}
											onChange={() =>
												onToggleSelect(
													String(it.id),
												)
											}
											aria-label={`Select ${it.title}`}
										/>
									</td>
								)}
								<td className="px-4 py-3 text-sm text-slate-800">
									{it.title}
									<div className="text-xs text-slate-500">
										#{it.id}
									</div>
								</td>
								<td className="px-4 py-3 text-sm text-slate-700">
									{it.assignmentKey || "—"}
								</td>
								<td className="px-4 py-3 text-sm text-slate-700">
									{it.category || "—"}
								</td>
								<td className="px-4 py-3 text-sm text-slate-700">
									{it.active === undefined
										? "—"
										: it.active
											? "Yes"
											: "No"}
								</td>
								<td className="px-4 py-3 text-sm text-slate-700">
									{it.displayOrder ?? "—"}
								</td>
								<td className="px-4 py-3 text-sm text-slate-700">
									{it.contentVersion ?? "—"}
								</td>
							</tr>
						))}
						{!filtered.length && !loading ? (
							<tr>
								<td
									colSpan={selectionMode ? 7 : 6}
									className="px-4 py-6 text-sm text-slate-500"
								>
									No catalog items found.
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
						load(false).catch(() => {});
					}}
					disabled={loading || !hasMore}
				>
					{loading ? "Loading…" : hasMore ? "Load more" : "No more"}
				</button>
			</div>
		</div>
	);
}
