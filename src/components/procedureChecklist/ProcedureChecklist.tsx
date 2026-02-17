import * as React from "react";
import RoleBasedViewProps from "@type/RoleBasedViewProps";
import { ProcedureChecklistApi } from "@api/ProcedureChecklist";
import { ProcedureChecklistItem } from "@type/ProcedureChecklist";
import { IProcedureStep } from "@data/LOPProcedureChecklist.mock";
import * as Utils from "@utils";

export function ProcedureChecklist({
	userGroupNames,
	pnpWrapper,
	sourceRole,
}: RoleBasedViewProps): JSX.Element {
	const [procedures, setProcedures] = React.useState<
		ProcedureChecklistItem[]
	>([]);
	const [search, setSearch] = React.useState("");
	const [isLoading, setIsLoading] = React.useState<boolean>(true);
	const [selectedProcedure, setSelectedProcedure] =
		React.useState<ProcedureChecklistItem | null>(null);
	const [currentStep, setCurrentStep] = React.useState<number>(1);
	const [steps, setSteps] = React.useState<IProcedureStep[]>([]);
	const sublistSteps = selectedProcedure
		? selectedProcedure.obj!.lists.length
		: 0;

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
		setSteps([]); //todo: <-------------------
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

	const currentProcedureSteps = React.useMemo(() => {
		if (!selectedProcedure) return [];
		return steps
			.filter((s) => s.procedureId === selectedProcedure.id)
			.sort((a, b) => a.stepNumber - b.stepNumber);
	}, [selectedProcedure, steps]);

	const currentStepData = React.useMemo(() => {
		return currentProcedureSteps.find((s) => s.stepNumber === currentStep);
	}, [currentProcedureSteps, currentStep]);

	const handleSelectProcedure: (procedure: ProcedureChecklistItem) => void = (
		procedure: ProcedureChecklistItem,
	) => {
		setSelectedProcedure(procedure);
		setCurrentStep(1);
	};

	const goToNextStep: () => void = () => {
		if (selectedProcedure && currentStep < sublistSteps) {
			setCurrentStep(currentStep + 1);
		}
	};

	const goToPreviousStep: () => void = () => {
		if (currentStep > 1) {
			setCurrentStep(currentStep - 1);
		}
	};
	return (
		<section className="p-4 text-sm">
			LOPS - Legal Office Procedural System
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
			<p className="mt-2 text-xs text-slate-500">
				{isLoading
					? "Loading procedures…"
					: selectedProcedure
						? `Viewing: ${selectedProcedure.title} - Step ${currentStep} of ${sublistSteps}`
						: `${filtered.length} procedures available`}
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
										<li
											key={proc.id}
											className="px-3 py-2 hover:bg-slate-50 cursor-pointer transition-colors"
											onClick={() =>
												handleSelectProcedure(proc)
											}
										>
											<div className="flex items-center justify-between">
												<div>
													<p className="text-sm font-semibold text-slate-750">
														{proc.title}
													</p>
													<p className="text-xs text-slate-600 mt-0.5">
														Category:{" "}
														{proc.category} •{" "}
														{sublistSteps} steps
													</p>
												</div>
												<span className="text-blue-600 text-xs font-medium">
													View →
												</span>
											</div>
										</li>
									))}
								</ul>
							)}
						</>
					) : (
						<div className="mt-3">
							<button
								onClick={() => setSelectedProcedure(null)}
								className="mb-2 text-sm text-blue-600 hover:underline"
							>
								← Back to procedure list
							</button>
							<div className="border border-slate-400 rounded-md overflow-hidden bg-white">
								<div className="w-full h-64 bg-slate-100 flex items-center justify-center">
									{currentStepData ? (
										<div className="text-center p-6 w-full">
											<div className="w-full h-48 bg-gradient-to-br from-blue-50 to-slate-100 rounded-lg flex items-center justify-center mb-3 border-2 border-dashed border-slate-300">
												<div className="text-center px-4">
													<p className="text-4xl mb-2">
														📋
													</p>
													<p className="text-sm font-semibold text-slate-700">
														Step {currentStep}
													</p>
													<p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
														{
															currentStepData.description
														}
													</p>
												</div>
											</div>
											<p className="text-xs text-slate-500 italic">
												Actual procedure screenshot will
												appear here
											</p>
										</div>
									) : (
										<p className="text-slate-500">
											Loading step...
										</p>
									)}
								</div>
								<div className="px-4 py-3 bg-slate-50 border-t border-slate-300">
									<div className="flex items-center justify-between mb-2">
										<button
											onClick={goToPreviousStep}
											disabled={currentStep === 1}
											className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
										>
											← Back
										</button>
										<span className="text-sm text-slate-600 font-medium">
											Step {currentStep} of {sublistSteps}
										</span>
										<button
											onClick={goToNextStep}
											disabled={
												currentStep === sublistSteps
											}
											className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
										>
											Next →
										</button>
									</div>
									<a
										href={selectedProcedure.documentURL}
										target="_blank"
										rel="noreferrer"
										className="block text-center text-blue-600 hover:underline text-xs"
									>
										Download full PDF procedure
									</a>
								</div>
							</div>
						</div>
					)}
				</>
			)}
		</section>
	);
}
