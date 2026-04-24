import * as React from "react";
import type { PNPWrapper } from "@utils/PNPWrapper";

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
	pnpWrapper,
}: {
	query: string;
	selectionMode: boolean;
	selectedIds: string[];
	onToggleSelect: (id: string) => void;
	pnpWrapper: PNPWrapper;
}): JSX.Element {
	const [items, setItems] = React.useState<AssignmentRow[]>([]);
	const [skip, setSkip] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | undefined>(undefined);
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
		const candidates = [
			key,
			key.replace(/([a-zA-Z])(\d+)/g, "$1 $2"),
			key.replace(/\d+$/, ""),
		].filter(Boolean);
		for (const c of candidates) {
			const exact = all.find((l) => String(l.Title).toLowerCase() === c.toLowerCase());
			if (exact?.Title) return exact.Title;
		}
		const norms = candidates.map(normalizeTitle);
		for (const n of norms) {
			const hit = all.find((l) => normalizeTitle(String(l.Title)) === n);
			if (hit?.Title) return hit.Title;
		}
		const stripped = key.replace(/\d+$/, "");
		const strippedNorm = stripped ? normalizeTitle(stripped) : "";
		if (strippedNorm) {
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
		try {
			const web = pnpWrapper.web();
			const listTitle = await resolveListTitle(ENV.LIST_ASSIGNMENTS || "Assignments1");
			const statusField = ENV.INTERNALCOLUMN_ASSIGNMENTSTATUS || "Status";
			const rows = (await web.lists
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
				.skip(reset ? 0 : skip)
				.top(pageSize)()) as Array<Record<string, unknown>>;

			const mapped: AssignmentRow[] = (rows || []).map((r) => ({
				id: Number(r.Id),
				title: String(r.Title || "(untitled)"),
				employeeEmail: typeof r.EmployeeEmail === "string" ? r.EmployeeEmail : undefined,
				dueDate: typeof r.DueDate === "string" ? r.DueDate : undefined,
				status:
					typeof (r as Record<string, unknown>)[statusField] === "string"
						? ((r as Record<string, unknown>)[statusField] as string)
						: undefined,
				percentComplete:
					typeof r.PercentComplete === "number" ? r.PercentComplete : undefined,
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
		load(true).catch(() => {});
	}, []);

	const filtered = query.trim()
		? items.filter((i) =>
				`${i.title} ${i.employeeEmail ?? ""} ${i.status ?? ""}`
					.toLowerCase()
					.includes(query.trim().toLowerCase()),
			)
		: items;

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
							{selectionMode && <th className="w-10 px-3 py-2" />}
							{["Title", "Employee", "Due", "Status", ""].map((h) => (
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
						{filtered.map((it) => {
							const due = it.dueDate ? new Date(it.dueDate) : undefined;
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
												checked={selectedIds?.includes(String(it.id))}
												onChange={() => onToggleSelect(String(it.id))}
												aria-label={`Select ${it.title}`}
											/>
										</td>
									)}
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
										{it.status || "—"}
									</td>
									<td className="px-4 py-3 text-right text-sm text-slate-600">
										#{it.id}
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

