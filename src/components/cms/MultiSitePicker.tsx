import * as React from "react";

export function MultiSitePicker({
	value,
	onChange,
}: {
	value: string[];
	onChange: (v: string[]) => void;
}): JSX.Element {
	const [open, setOpen] = React.useState(false);
	const [draft, setDraft] = React.useState<string>("");

	return (
		<div className="relative">
			<div className="flex items-center gap-2">
				<label className="text-sm text-slate-700">Sites</label>
				<div className="flex flex-wrap items-center gap-2">
					{value.map((s, i) => (
						<span
							key={i}
							className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs"
						>
							{s}
							<button
								className="text-slate-500"
								onClick={() =>
									onChange(value.filter((v) => v !== s))
								}
								aria-label={`Remove ${s}`}
							>
								×
							</button>
						</span>
					))}
					<button
						className="rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50"
						onClick={() => setOpen(!open)}
						aria-expanded={open}
					>
						{open ? "Done" : "Edit"}
					</button>
				</div>
			</div>
			{open && (
				<div className="absolute z-10 mt-2 w-[28rem] rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
					<p className="text-sm text-slate-700">
						Add a site collection URL
					</p>
					<div className="mt-2 flex gap-2">
						<input
							value={draft}
							onChange={(e) => setDraft(e.target.value)}
							placeholder="/sites/<another-site-collection>"
							className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
						/>
						<button
							className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
							onClick={() => {
								if (draft) {
									onChange([...value, draft]);
									setDraft("");
								}
							}}
						>
							Add
						</button>
					</div>
					<p className="mt-2 text-xs text-slate-500">
						Placeholder: later this can use a picker against the
						tenant.
					</p>
				</div>
			)}
		</div>
	);
}
