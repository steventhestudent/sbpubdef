import * as React from "react";
import RoleBasedViewProps from "@type/RoleBasedViewProps";
import { ProcedureChecklistApi } from "@api/ProcedureChecklist";
import {
	ProcedureChecklistItem,
	ProcedureChecklistParsedJSON,
} from "@type/ProcedureChecklist";
import * as Utils from "@utils";
import { ProcedureChecklistCompactView } from "@components/procedureChecklist/ProcedureChecklistCompactView";
import { ProcedureChecklistListItem } from "@components/procedureChecklist/ProcedureChecklistListItem";
import ClearableInput from "@components/ClearableInput";

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

	const onProcedureSelected = (proc: ProcedureChecklistItem): void => {
		setSelectedProcedure(proc);
		setCurrentStep(1);
		if (!proc.obj)
			Utils.loadJSON<ProcedureChecklistParsedJSON>(
				pnpWrapper.ctx,
				proc.json,
				(data) => {
					const i = procedures.indexOf(proc);
					proc.obj = data;
					procedures[i] = proc;
					setProcedures(procedures);
					setSelectedProcedure(undefined);
					setSelectedProcedure(procedures[i]);
				},
			);
	};

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
								<ul className="mt-3 h-[15em] divide-y divide-slate-400 overflow-x-hidden overflow-y-scroll rounded-md border border-slate-400 bg-white">
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
							editorMode={editorMode}
						/>
					)}
				</>
			)}
		</section>
	);
}
