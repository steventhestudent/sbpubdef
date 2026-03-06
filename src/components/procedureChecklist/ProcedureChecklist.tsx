import * as React from "react";
import RoleBasedViewProps from "@type/RoleBasedViewProps";
import { ProcedureChecklistApi } from "@api/ProcedureChecklist";
import { ProcedureChecklistItem } from "@type/ProcedureChecklist";
import * as Utils from "@utils";
import { ProcedureFilters } from "@components/procedureChecklist/ProcedureFilters";
import { ProcedureChecklistListItem } from "@components/procedureChecklist/ProcedureChecklistListItem";
import { ProcedureChecklistCompactView } from "@components/procedureChecklist/ProcedureChecklistCompactView";
import ClearableInput from "@components/ClearableInput";
import { ProcedureStepItem } from "@type/ProcedureSteps";
import { ProcedureStepsApi } from "@api/ProcedureChecklist/ProcedureStepsApi";

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

	const [selectedProcedure, setSelectedProcedure] = React.useState<
		ProcedureChecklistItem | undefined
	>(undefined);

	// NEW
	const [steps, setSteps] = React.useState<ProcedureStepItem[] | undefined>(
		undefined,
	);
	const [stepIndex, setStepIndex] = React.useState<number>(0); // 0..steps.length (steps.length = final slide)

	const procedureChecklistApi = new ProcedureChecklistApi(pnpWrapper);
	const procedureStepsApi = new ProcedureStepsApi(pnpWrapper);

	const load: () => Promise<void> = async () => {
		const rows = await procedureChecklistApi.get(150);
		const mapped = (rows || []).map((item: ProcedureChecklistItem) => ({
			id: item.id,
			title: item.title,
			purpose: item.purpose,
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

	const onProcedureSelected = async (
		proc: ProcedureChecklistItem,
	): Promise<void> => {
		setSelectedProcedure(proc);
		setSteps(undefined);
		setStepIndex(0);
		const s = await procedureStepsApi.get(999, {
			procedureChecklistId: proc.id,
		});
		setSteps(s || []);
	};

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
		<section className="p-4 text-sm">
			{selectedProcedure ? (
				<></>
			) : (
				<div className="mt-1 flex gap-2">
					<ClearableInput
						placeholder="Procedure name or category…"
						onChange={(e) =>
							setSearch(
								(e.target as HTMLInputElement).value || "",
							)
						}
					/>
				</div>
			)}

			{isLoading ? (
				"Loading procedures…"
			) : !selectedProcedure ? (
				<p className="mt-2 text-xs text-slate-500">
					{`${filtered.length} procedures available`}
					<ProcedureFilters procedures={procedures} />
					<span className="float-right cursor-pointer hover:text-blue-500">
						{editorMode ? "➕" : ""}
					</span>
				</p>
			) : (
				<></>
			)}

			{!isLoading && (
				<>
					{!selectedProcedure ? (
						<>
							{filtered.length === 0 ? (
								<div className="mt-3 rounded-md border border-slate-400 bg-slate-50 px-3 py-2 text-sm text-slate-600">
									No procedures match this search.
								</div>
							) : (
								<ul className="mt-3 h-[30em] divide-y divide-slate-400 overflow-x-hidden overflow-y-scroll rounded-md border border-slate-400 bg-white">
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
							steps={steps}
							stepIndex={stepIndex}
							setStepIndex={setStepIndex}
							editorMode={editorMode}
						/>
					)}
				</>
			)}
		</section>
	);
}
