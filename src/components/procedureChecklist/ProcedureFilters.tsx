import * as React from "react";
import { ProcedureChecklistItem } from "@type/ProcedureChecklist";

export function ProcedureFiltersFloating({
	procedures,
}: {
	procedures: ProcedureChecklistItem[];
}) {
	const [categories, setCategories] = React.useState<{
		[key: string]: number;
	}>({});
	React.useEffect(() => {
		let c: { [key: string]: number } = {};
		procedures.forEach(($0) => {
			if (c[$0.category]) c[$0.category] = c[$0.category] + 1;
			else c[$0.category] = 1;
		});
		setCategories(c);
	}, [procedures]);
	return (
		<div className="absolute left-0 hidden w-[10em] group-focus-within:block group-hover:block">
			<select className="focus:ring-opacity-50 mt-1 block w-full rounded-md border border-gray-300 bg-white p-2 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200">
				<option value="">Category</option>
				{Object.keys(categories).map(($0, i) => (
					<option
						key={i}
						value={$0}
					>{`${$0} (${categories[$0]})`}</option>
				))}
			</select>
		</div>
	);
}

export function ProcedureFilters({
	procedures,
}: {
	procedures: ProcedureChecklistItem[];
}) {
	return (
		<span className="group relative ml-[1.5em]">
			Filters:
			<button
				type="button"
				className="absolute ml-1 inline-flex h-4 w-4 items-center justify-center rounded-lg bg-[#c9cbcc] transition-transform hover:bg-slate-400 focus:ring-2 focus:ring-[#0078D4] focus:ring-offset-2 focus:outline-none active:bg-slate-600"
			>
				<span aria-hidden="true">
					<svg viewBox="0 0 24 24" className="h-5 w-5">
						<path
							d="M6 9l6 6 6-6"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						/>
					</svg>
				</span>
			</button>
			<ProcedureFiltersFloating procedures={procedures} />
		</span>
	);
}
