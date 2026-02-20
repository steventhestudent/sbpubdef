import * as React from "react";
import { ProcedureChecklistItem } from "@type/ProcedureChecklist";

export const ProcedureChecklistCompactView = ({
	selectedProcedure,
	setSelectedProcedure,
	currentStep,
	setCurrentStep,
}: {
	selectedProcedure: ProcedureChecklistItem;
	setSelectedProcedure: (
		// prettier-ignore
		value: ((prevState: ProcedureChecklistItem | null,) => ProcedureChecklistItem | null) | ProcedureChecklistItem | null,
	) => void;
	currentStep: number;
	setCurrentStep: (value: ((prevState: number) => number) | number) => void;
}) => {
	React.useEffect(() => {
		// setSteps([]); //todo: <-------------------
	}, []);

	if (!selectedProcedure.obj) return <div>loading...</div>;

	const [sublistIndex, setSublistIndex] = React.useState<number>(0);
	const sublist =
		selectedProcedure.obj.lists[sublistIndex].list_txt.split("\n");

	const goToNextStep: () => void = () => {
		if (selectedProcedure && currentStep < sublist.length)
			setCurrentStep(currentStep + 1);
	};

	const goToPreviousStep: () => void = () => {
		if (currentStep > 1) setCurrentStep(currentStep - 1);
	};

	console.log(setSublistIndex);
	return (
		<div className="mt-3">
			<div>
				<button
					onClick={() => setSelectedProcedure(null)}
					className="mb-2 text-sm text-blue-600 hover:underline"
				>
					← Back to procedure list
				</button>
				<span
					title="Download..."
					className="block text-center text-blue-600 hover:underline text-xs cursor-pointer float-right"
					onClick={() => {
						window.open(selectedProcedure.documentURL);
					}}
				>
					⤓
				</span>
			</div>
			<div className="border border-slate-400 rounded-md overflow-hidden bg-white">
				<div className="w-full h-64 bg-slate-100 flex items-center justify-center">
					<div className="text-center p-6 w-full">
						<div className="w-full h-48 bg-gradient-to-br from-blue-50 to-slate-100 rounded-lg flex items-center justify-center mb-3 border-2 border-dashed border-slate-300">
							<div className="text-center px-4">
								<p className="text-4xl mb-2">📋</p>
								<p className="text-sm font-semibold text-slate-700">
									Step {currentStep}
								</p>
								<p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
									{sublist[currentStep - 1]}
								</p>
							</div>
						</div>
						<p className="text-xs text-slate-500 italic">
							Actual procedure screenshot will appear here
						</p>
					</div>
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
							Step {currentStep} of {sublist.length}
						</span>
						<button
							onClick={goToNextStep}
							disabled={currentStep === sublist.length}
							className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
						>
							Next →
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
