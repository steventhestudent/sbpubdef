import * as React from "react";
import type { PNPWrapper } from "@utils/PNPWrapper";

type CatalogRow = { Id: number; Title?: string; AssignmentKey?: string; Active?: boolean };

function norm(s: string): string {
	return s.trim().toLowerCase();
}

export function AssignmentCatalogPicker({
	pnpWrapper,
	value,
	onChange,
	label = "AssignmentCatalog",
	placeholder = "Search assignment catalog…",
}: {
	pnpWrapper: PNPWrapper;
	value: { id?: number; title?: string; assignmentKey?: string };
	onChange: (next: { id?: number; title?: string; assignmentKey?: string }) => void;
	label?: string;
	placeholder?: string;
}): JSX.Element {
	const [query, setQuery] = React.useState("");
	const [open, setOpen] = React.useState(false);
	const [loading, setLoading] = React.useState(false);
	const [rows, setRows] = React.useState<CatalogRow[]>([]);

	React.useEffect(() => {
		if (!query || norm(query).length < 2) {
			setRows([]);
			return;
		}
		let cancelled = false;
		setLoading(true);
		(async () => {
			const q = norm(query).replace(/'/g, "''");
			const listTitle = ENV.LIST_ASSIGNMENTCATALOG || "AssignmentCatalog";
			const res = (await pnpWrapper
				.web()
				.lists.getByTitle(listTitle)
				.items.select("Id", "Title", "AssignmentKey", "Active")
				.filter(
					`substringof('${q}',Title) or substringof('${q}',AssignmentKey)`,
				)
				.orderBy("Title", true)
				.top(20)()) as unknown as CatalogRow[];
			if (cancelled) return;
			setRows(res || []);
			setLoading(false);
		})().catch(() => {
			if (cancelled) return;
			setRows([]);
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [query, pnpWrapper]);

	function pick(r: CatalogRow): void {
		onChange({
			id: r.Id,
			title: (r.Title || "").trim(),
			assignmentKey: (r.AssignmentKey || "").trim() || undefined,
		});
		setOpen(false);
		setQuery("");
	}

	return (
		<div>
			<label className="block text-sm font-medium text-slate-700" htmlFor="as-catalog-picker">
				{label}
			</label>

			<div className="mt-1 space-y-2">
				{value.id ? (
					<div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
						<div className="min-w-0">
							<div className="truncate font-medium text-slate-800">
								{value.title || "(untitled)"}{" "}
								<span className="font-normal text-slate-500">#{value.id}</span>
							</div>
							{value.assignmentKey ? (
								<div className="truncate text-xs text-slate-500">
									{value.assignmentKey}
								</div>
							) : null}
						</div>
						<button
							type="button"
							className="rounded-md border border-slate-300 px-2 py-1 text-xs"
							onClick={() => onChange({})}
						>
							Clear
						</button>
					</div>
				) : null}

				<input
					id="as-catalog-picker"
					value={query}
					onChange={(e) => {
						setQuery(e.target.value);
						setOpen(true);
					}}
					onFocus={() => setOpen(true)}
					placeholder={placeholder}
					className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
				/>

				{open && (loading || rows.length > 0) && (
					<div className="rounded-md border border-slate-200 bg-white">
						{loading ? (
							<div className="px-3 py-2 text-xs text-slate-500">Searching…</div>
						) : null}
						{rows.map((r) => (
							<button
								key={r.Id}
								type="button"
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => pick(r)}
								className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
							>
								<span className="min-w-0 truncate">
									{r.Title || "(untitled)"}{" "}
									<span className="text-xs text-slate-500">#{r.Id}</span>
									{r.AssignmentKey ? (
										<span className="ml-2 text-xs text-slate-500">
											{r.AssignmentKey}
										</span>
									) : null}
								</span>
								<span className="ml-3 text-xs text-slate-400">
									{r.Active === false ? "inactive" : ""}
								</span>
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

