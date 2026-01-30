import * as React from "react";
import type { ILopsDirectoryProps } from "./ILopsDirectoryProps";
import { Collapsible } from "@components/Collapsible";

interface IProcedure {
	id: number;
	title: string;
	category: string;
}

const SAMPLE_PROCEDURES: IProcedure[] = [
	{ id: 1, title: "Sample Procedure: Client Intake", category: "Attorney" },
	{ id: 2, title: "Sample Procedure: Case Filing", category: "LOP" },
	{ id: 3, title: "Sample Procedure: Evidence Review", category: "Investigator" },
];

export const LopsDirectory: React.FC<ILopsDirectoryProps> = (props) => {
	const [procedures, setProcedures] = React.useState<IProcedure[]>([]);
	const [search, setSearch] = React.useState("");
	const [isLoading, setIsLoading] = React.useState<boolean>(true);

	React.useEffect(() => {
		// TODO: Load procedures from SharePoint list
		// Placeholder for now - simulating API call
		setTimeout(() => {
			setProcedures(SAMPLE_PROCEDURES);
			setIsLoading(false);
		}, 500);
	}, []);

	const filtered = React.useMemo(() => {
		const term = search.trim().toLowerCase();
		if (!term) return procedures;

		return procedures.filter((proc) => {
			const haystack = [proc.title, proc.category]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();

			return haystack.includes(term);
		});
	}, [search, procedures]);

	return (
		<Collapsible
			instanceId={props.instanceId}
			title="LOPS - Legal Office Procedural System"
		>
			<div className="p-4 text-sm">
				{/* Search */}
				<label
					className="block text-xs font-medium text-slate-700"
					htmlFor="lops-search"
				>
					Search procedures
				</label>
				<div className="mt-1 flex gap-2">
					<input
						id="lops-search"
						type="search"
						className="w-full rounded-md border border-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="Procedure name or category…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>

				{/* Status */}
				<p className="mt-2 text-xs text-slate-500">
					{isLoading
						? "Loading procedures…"
						: `Showing ${filtered.length} of ${procedures.length} procedures`}
				</p>

				{/* List */}
				{!isLoading && (
					<>
						{filtered.length === 0 ? (
							<div className="mt-3 rounded-md border border-slate-400 bg-slate-50 px-3 py-2 text-sm text-slate-600">
								No procedures match this search.
							</div>
						) : (
							<ul className="mt-3 divide-y divide-slate-400 rounded-md border border-slate-400 bg-white">
								{filtered.map((proc) => (
									<li key={proc.id} className="px-3 py-2">
										<p className="text-sm font-semibold text-slate-750">
											{proc.title}
										</p>
										<p className="text-xs text-slate-600 mt-0.5">
											Category: {proc.category}
										</p>
									</li>
								))}
							</ul>
						)}

						<div className="mt-4 rounded-md bg-blue-50 border border-blue-200 p-3">
							<p className="text-xs text-blue-800">
								<strong>📋 Placeholder Data</strong> - This web part is scaffolded and ready for development. Steven will implement PDF viewer and step-by-step navigation next week.
							</p>
						</div>
					</>
				)}
			</div>
		</Collapsible>
	);
};

export default LopsDirectory;