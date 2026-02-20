import * as React from "react";
import RoleBasedViewProps from "@type/RoleBasedViewProps";
import { ProcedureChecklistApi } from "@api/ProcedureChecklist";
import { ProcedureChecklistItem } from "@type/ProcedureChecklist";
import * as Utils from "@utils";
import { ProcedureChecklistCompactView } from "@components/procedureChecklist/ProcedureChecklistCompactView";
import { ProcedureChecklistListItem } from "@components/procedureChecklist/ProcedureChecklistListItem";

export function ProcedureChecklist({
	userGroupNames,
	pnpWrapper,
	sourceRole,
}: RoleBasedViewProps): JSX.Element {
	const editorMode: boolean = sourceRole === "IT";
	const [procedures, setProcedures] = React.useState<
		ProcedureChecklistItem[]
	>([]);
	const [search, setSearch] = React.useState("");
	const [isLoading, setIsLoading] = React.useState<boolean>(true);
	const [selectedProcedure, setSelectedProcedure] =
		React.useState<ProcedureChecklistItem | null>(null);
	const [currentStep, setCurrentStep] = React.useState<number>(1);

	const procedureChecklistApi = new ProcedureChecklistApi(pnpWrapper);
	const load: () => Promise<void> = async () => {
		const rows = await procedureChecklistApi.get(150);
		const mapped = (rows || []).map((item: ProcedureChecklistItem) => ({
			id: item.id,
			title: item.title,
			category: item.category,
			filename: item.filename,
			effectiveDate: item.effectiveDate,
			pageCount: item.pageCount,
			json: item.json,
			documentURL: item.documentURL,
		}));
		setProcedures(mapped.length ? mapped : []);
		setIsLoading(false);
	};

	React.useEffect(() => {
		Utils.loadCachedThenFresh(load);
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

	const onProcedureSelected = (proc: ProcedureChecklistItem) => {
		setSelectedProcedure(proc);
		setCurrentStep(1);
		if (!proc.obj)
			Utils.loadJSON(pnpWrapper.ctx, proc.json, (data) => {
				const i = procedures.indexOf(proc);
				proc.obj = data;
				procedures[i] = proc;
				setProcedures(procedures);
				setSelectedProcedure(null);
				setSelectedProcedure(procedures[i]);
			});
	};

	return (
		<section className="p-4 text-sm ">
			{selectedProcedure ? (
				<></>
			) : (
				<div className="mt-1 flex gap-2">
					<input
						id="lops-search"
						type="search"
						className="w-full rounded-md border border-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="Procedure name or category…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
					<button
						type="button"
						className="rounded-md border-slate-300 px-3 text-sm text-white font-bold absolute right-[1.333em] mt-[0.666em] opacity-60 hover:opacity-100"
						aria-label="Run search"
					>
						🔍
					</button>
				</div>
			)}
			<p className="mt-2 text-xs text-slate-500">
				{isLoading
					? "Loading procedures…"
					: selectedProcedure
						? // ? `Viewing: ${selectedProcedure.title} - Step ${currentStep} of ${sublistSteps}`
							`Viewing: ${selectedProcedure.title} - Step ${currentStep} of ${selectedProcedure.obj ? selectedProcedure.obj.lists.length : "..."}`
						: `${filtered.length} procedures available`}
				{editorMode ? (
					<span className="float-right hover:text-blue-500 cursor-pointer">
						{selectedProcedure ? "re-import" : "➕"}
					</span>
				) : (
					<></>
				)}
			</p>
			{!isLoading && (
				<>
					{!selectedProcedure ? (
						<>
							{filtered.length === 0 ? (
								<div className="mt-3 rounded-md border border-slate-400 bg-slate-50 px-3 py-2 text-sm text-slate-600">
									No procedures match this search.
								</div>
							) : (
								<ul className="mt-3 divide-y divide-slate-400 rounded-md border border-slate-400 bg-white overflow-y-scroll h-[15em]">
									{filtered.map((proc) => (
										<ProcedureChecklistListItem
											key={proc.id}
											procedure={proc}
											onProcedureSelected={
												onProcedureSelected
											}
										/>
									))}
								</ul>
							)}
						</>
					) : (
						<ProcedureChecklistCompactView
							selectedProcedure={selectedProcedure}
							setSelectedProcedure={setSelectedProcedure}
							currentStep={currentStep}
							setCurrentStep={setCurrentStep}
						/>
					)}
				</>
			)}
		</section>
	);
}
