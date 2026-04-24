import * as React from "react";
import type { PNPWrapper } from "@utils/PNPWrapper";

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
	pnpWrapper,
}: {
	query: string;
	pnpWrapper: PNPWrapper;
}): JSX.Element {
	const [items, setItems] = React.useState<CatalogRow[]>([]);
	const [skip, setSkip] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const pageSize = 25;

	async function load(reset = false): Promise<void> {
		setLoading(true);
		try {
			const web = pnpWrapper.web();
			const listTitle = ENV.LIST_ASSIGNMENTCATALOG || "AssignmentCatalog";
			const cv = ENV.INTERNALCOLUMN_CONTENTVERSION || "ContentVersion0";
			const rows = (await web.lists
				.getByTitle(listTitle)
				.items.select(
					"Id",
					"Title",
					"AssignmentKey",
					"Category",
					"Active",
					"DisplayOrder",
					cv,
				)
				.orderBy("DisplayOrder", true)
				.skip(reset ? 0 : skip)
				.top(pageSize)()) as Array<Record<string, unknown>>;

			const mapped: CatalogRow[] = (rows || []).map((r) => ({
				id: Number(r.Id),
				title: String(r.Title || "(untitled)"),
				assignmentKey:
					typeof r.AssignmentKey === "string" ? r.AssignmentKey : undefined,
				category: typeof r.Category === "string" ? r.Category : undefined,
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
					typeof (r as Record<string, unknown>)[cv] === "string" ||
					typeof (r as Record<string, unknown>)[cv] === "number"
						? ((r as Record<string, unknown>)[cv] as string | number)
						: undefined,
			}));

			setItems((prev) => (reset ? mapped : [...prev, ...mapped]));
			setSkip((prev) => (reset ? pageSize : prev + pageSize));
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

	return (
		<div className="space-y-3">
			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-slate-200">
					<thead className="bg-slate-50">
						<tr>
							{["Title", "Key", "Category", "Active", "Order", "Version"].map(
								(h) => (
									<th
										key={h}
										className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
									>
										{h}
									</th>
								),
							)}
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-200">
						{filtered.map((it) => (
							<tr key={it.id} className="hover:bg-slate-50">
								<td className="px-4 py-3 text-sm text-slate-800">
									{it.title}
									<div className="text-xs text-slate-500">#{it.id}</div>
								</td>
								<td className="px-4 py-3 text-sm text-slate-700">
									{it.assignmentKey || "—"}
								</td>
								<td className="px-4 py-3 text-sm text-slate-700">
									{it.category || "—"}
								</td>
								<td className="px-4 py-3 text-sm text-slate-700">
									{it.active === undefined ? "—" : it.active ? "Yes" : "No"}
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
								<td colSpan={6} className="px-4 py-6 text-sm text-slate-500">
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
					disabled={loading}
				>
					{loading ? "Loading…" : "Load more"}
				</button>
			</div>
		</div>
	);
}

