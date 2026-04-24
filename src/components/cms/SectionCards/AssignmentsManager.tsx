import * as React from "react";
import type { PNPWrapper } from "@utils/PNPWrapper";
import { SelectAllCheckbox } from "@components/cms/SelectAllCheckbox";

type AssignmentRow = {
	id: number;
	title: string;
	employeeEmail?: string;
	dueDate?: string;
	status?: string;
	percentComplete?: number;
};

export function AssignmentsManager({
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
	const [items, setItems] = React.useState<AssignmentRow[]>([]);
	const [skip, setSkip] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | undefined>(undefined);
	const [resolvedListTitle, setResolvedListTitle] =
		React.useState<string>("");
	const pageSize = 25;

	function normalizeTitle(s: string): string {
		return s.replace(/\s+/g, "").trim().toLowerCase();
	}

	async function resolveListTitle(title: string): Promise<string> {
		const web = pnpWrapper.web();
		const key = title.trim();
		try {
			// eslint-disable-next-line @typescript-eslint/no-unused-expressions
			await web.lists.getByTitle(key).select("Id")();
			return key;
		} catch {
			// fall through
		}
		const all: Array<{ Title: string }> = await web.lists.select("Title")();

		// IMPORTANT: avoid falling back to the deprecated list "Assignments"
		// when the intended list key is "Assignments1".
		const primaryCandidates = [
			key,
			key.replace(/([a-zA-Z])(\d+)/g, "$1 $2"),
		].filter(Boolean);
		const strippedFallback = key.replace(/\d+$/, "");

		for (const c of primaryCandidates) {
			const exact = all.find(
				(l) => String(l.Title).toLowerCase() === c.toLowerCase(),
			);
			if (exact?.Title) return exact.Title;
		}

		for (const n of primaryCandidates.map(normalizeTitle)) {
			const hit = all.find((l) => normalizeTitle(String(l.Title)) === n);
			if (hit?.Title) return hit.Title;
		}

		// Only now allow stripped exact match (Assignments) as last resort.
		if (strippedFallback) {
			const exactStripped = all.find(
				(l) =>
					String(l.Title).toLowerCase() ===
					strippedFallback.toLowerCase(),
			);
			if (exactStripped?.Title) return exactStripped.Title;
			const strippedNorm = normalizeTitle(strippedFallback);
			const starts = all.find((l) =>
				normalizeTitle(String(l.Title)).startsWith(strippedNorm),
			);
			if (starts?.Title) return starts.Title;
		}
		return key;
	}

	async function load(reset = false): Promise<void> {
		setLoading(true);
		setError(undefined);
		if (reset) {
			setItems([]);
			setSkip(0);
		}
		try {
			const web = pnpWrapper.web();
			const listTitle = await resolveListTitle(
				ENV.LIST_ASSIGNMENTS || "Assignments1",
			);
			setResolvedListTitle(listTitle);
			const statusField = ENV.INTERNALCOLUMN_ASSIGNMENTSTATUS || "Status";
			const base = web.lists
				.getByTitle(listTitle)
				.items.select(
					"Id",
					"Title",
					"EmployeeEmail",
					"DueDate",
					statusField,
					"PercentComplete",
				)
				.orderBy("Id", false)
				.top(pageSize);

			// Some SharePoint endpoints behave oddly with `$skip=0` (returning empty results).
			// Only apply skip when it's actually needed.
			const rows = (await (reset ? base : base.skip(skip))()) as Array<
				Record<string, unknown>
			>;

			const mapped: AssignmentRow[] = (rows || []).map((r) => ({
				id: Number(r.Id),
				title: String(r.Title || "(untitled)"),
				employeeEmail:
					typeof r.EmployeeEmail === "string"
						? r.EmployeeEmail
						: undefined,
				dueDate: typeof r.DueDate === "string" ? r.DueDate : undefined,
				status:
					typeof (r as Record<string, unknown>)[statusField] ===
					"string"
						? ((r as Record<string, unknown>)[
								statusField
							] as string)
						: undefined,
				percentComplete:
					typeof r.PercentComplete === "number"
						? r.PercentComplete
						: undefined,
			}));

			setItems((prev) => (reset ? mapped : [...prev, ...mapped]));
			setSkip((prev) => (reset ? pageSize : prev + pageSize));
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : String(e);
			setError(msg || "Failed to load assignments.");
		} finally {
			setLoading(false);
		}
	}

	React.useEffect(() => {
		// run after mount to avoid any stale initial state
		setTimeout(() => {
			load(true).catch(() => {});
		}, 0);
	}, []);

	const filtered = query.trim()
		? items.filter((i) =>
				`${i.title} ${i.employeeEmail ?? ""} ${i.status ?? ""}`
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
			{error ? (
				<div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
					{error}
				</div>
			) : null}
			<div className="text-xs text-slate-500">
				List: {resolvedListTitle || "(resolving…)"} | Loaded:{" "}
				{items.length} | Showing: {filtered.length}
			</div>
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
										ariaLabel="Select all assignments"
									/>
								</th>
							)}
							{["ID", "Title", "Employee", "Due", "Status"].map(
								(h) => (
									<th
										key={h}
										className="px-4 py-2 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase"
									>
										{h}
									</th>
								),
							)}
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-200">
						{filtered.map((it) => {
							const due = it.dueDate
								? new Date(it.dueDate)
								: undefined;
							const dueLabel =
								due && !Number.isNaN(due.getTime())
									? due.toLocaleDateString()
									: "—";
							return (
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
									<td className="px-4 py-3 text-xs text-slate-600">
										#{it.id}
									</td>
									<td className="px-4 py-3 text-sm text-slate-800">
										{it.title}
									</td>
									<td className="px-4 py-3 text-sm text-slate-700">
										{it.employeeEmail || "—"}
									</td>
									<td className="px-4 py-3 text-sm text-slate-700">
										{dueLabel}
									</td>
									<td className="px-4 py-3 text-sm text-slate-700">
										<span
											className={
												String(it.status || "")
													.toLowerCase()
													.includes("overdue")
													? "font-semibold text-red-700"
													: ""
											}
										>
											{it.status || "—"}
										</span>
									</td>
								</tr>
							);
						})}
						{!filtered.length && !loading ? (
							<tr>
								<td
									colSpan={selectionMode ? 6 : 5}
									className="px-4 py-6 text-sm text-slate-500"
								>
									No assignments found.
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
