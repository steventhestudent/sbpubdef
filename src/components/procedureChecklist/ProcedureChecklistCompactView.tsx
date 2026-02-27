import * as React from "react";
import { ProcedureChecklistItem } from "@type/ProcedureChecklist";
import { ProcedureChecklistOverlay } from "./ProcedureChecklistOverlay";

export const ProcedureChecklistCompactView = ({
	selectedProcedure,
	setSelectedProcedure,
	currentStep,
	setCurrentStep,
	editorMode = false,
}: {
	selectedProcedure: ProcedureChecklistItem;
	setSelectedProcedure: (
		// prettier-ignore
		value: ((prevState: ProcedureChecklistItem | undefined,) => ProcedureChecklistItem | undefined) | ProcedureChecklistItem | undefined,
	) => void;
	currentStep: number;
	setCurrentStep: (value: ((prevState: number) => number) | number) => void;
	editorMode?: boolean;
}): JSX.Element => {
	React.useEffect(() => {
		// setSteps([]); //todo: <-------------------
	}, []);

	const [maximizePurpose, setMaximizePurpose] = React.useState(false);
	if (!selectedProcedure.obj) return <div>loading...</div>;

	const [sublistIndex, setSublistIndex] = React.useState<number>(0);
	const getSublist: (
		proc: ProcedureChecklistItem,
		i: number,
	) => [string] | string[] = (proc: ProcedureChecklistItem, i: number) => {
		console.log(proc.obj); //cdd ready referral form has no list_txt!???
		if (!proc.obj!.lists.length) {
			proc.obj!.lists[0] = {
				list_txt: "",
				associated_images: [],
				list_page_range: [0, 0],
			};
			return [""];
		}
		return proc
			.obj!.lists[i].list_txt.split("\n")
			.filter((str: string) => str.trim() !== "");
	};
	const sublist = getSublist(selectedProcedure, sublistIndex);

	const [showOverlay, setShowOverlay] = React.useState<boolean | string>(
		false,
	);

	const goToPreviousStep: () => void = () => {
		if (currentStep > 1) setCurrentStep(currentStep - 1);
		else if (sublistIndex > 0) {
			setSublistIndex(sublistIndex - 1);
			setCurrentStep(-1);
			console.log(`prev list`);
		}
	};
	React.useEffect(() => {
		if (currentStep === -1) setCurrentStep(sublist.length);
	}, [currentStep]);

	const goToNextStep: () => void = () => {
		if (currentStep < sublist.length) setCurrentStep(currentStep + 1);
		else if (sublistIndex < selectedProcedure.obj!.lists.length - 1) {
			setSublistIndex(sublistIndex + 1);
			setCurrentStep(1);
			console.log(`next list`);
		}
	};

	return (
		<div className="">
			<p className="text-xs text-slate-500">
				{editorMode ? (
					<span className="float-right cursor-pointer hover:text-blue-500">
						re-import
					</span>
				) : (
					<></>
				)}
			</p>
			<h2 className="mt-0">
				{selectedProcedure.title || selectedProcedure.filename}
			</h2>
			{selectedProcedure.obj.effectiveDate ? (
				<>
					<b>Effective Date:</b> {selectedProcedure.obj.effectiveDate}
				</>
			) : (
				<></>
			)}
			<br />
			{selectedProcedure.obj.purpose ? (
				<>
					<b>Purpose:</b>
					<div
						className="float-right cursor-pointer text-blue-500 hover:underline"
						onClick={() => setMaximizePurpose(!maximizePurpose)}
					>
						{maximizePurpose ? "Show Less..." : "Show More..."}
					</div>
				</>
			) : (
				<></>
			)}
			<div
				className="relative"
				style={{
					overflow: maximizePurpose ? "auto" : "hidden",
					maxHeight: maximizePurpose ? "inherit" : "2.5em",
				}}
			>
				{selectedProcedure.obj.purpose}
			</div>
			{showOverlay ? (
				<ProcedureChecklistOverlay
					proc={selectedProcedure}
					onClose={() => setShowOverlay(false)}
					url={
						showOverlay && showOverlay !== true
							? showOverlay
							: undefined
					}
				/>
			) : (
				<></>
			)}
			<div>
				<button
					onClick={() => setSelectedProcedure(undefined)}
					className="mb-2 text-sm text-blue-600 hover:underline"
				>
					← Back to procedure list
				</button>
				<span
					title="Fullscreen"
					className="float-right ml-2 block cursor-pointer text-center text-xs text-blue-600 hover:underline"
					onClick={() => {
						setShowOverlay(true);
					}}
				>
					⛶
				</span>
				<span
					title="Download..."
					className="float-right block cursor-pointer text-center text-xs text-blue-600 hover:underline"
					onClick={() => {
						window.open(selectedProcedure.documentURL);
					}}
				>
					⤓
				</span>
			</div>
			<div className="overflow-hidden rounded-md border border-slate-400 bg-white">
				<div className="flex h-64 w-full items-center justify-center bg-slate-100">
					<div className="w-full p-6 text-center">
						<div className="mb-3 flex h-48 w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-gradient-to-br from-blue-50 to-slate-100">
							<div className="px-4 text-center">
								<p className="mb-2 text-4xl">📋</p>
								<p className="text-sm font-semibold text-slate-500">
									Sub-Step {currentStep} / {sublist.length}
								</p>
								<p className="mx-auto mt-1 max-w-md text-xs font-semibold text-slate-900">
									{sublist[currentStep - 1]}
								</p>
							</div>
						</div>
					</div>
				</div>
				<div className="h-[80px] w-full justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-gradient-to-br from-blue-50 to-slate-100">
					{selectedProcedure.obj.lists[
						sublistIndex
					].associated_images.map((src, i) => (
						<div
							key={i}
							className="mr-2 inline-block h-full w-[80px] cursor-pointer bg-black outline-1 outline-white"
						>
							<img
								key={i}
								src={src}
								className="h-full"
								onClick={() => setShowOverlay(src)}
							/>
						</div>
					))}
				</div>
				<div className="border-t border-slate-300 bg-slate-50 px-4 py-3">
					<div className="mb-2 flex items-center justify-between">
						<button
							onClick={goToPreviousStep}
							disabled={currentStep === 1 && sublistIndex === 0}
							className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
						>
							← Back
						</button>
						<span className="text-sm font-medium text-slate-600">
							{`Sub-list ${sublistIndex + 1} / ${selectedProcedure.obj.lists.length}`}
						</span>
						<button
							onClick={goToNextStep}
							disabled={
								currentStep === sublist.length &&
								sublistIndex ===
									selectedProcedure.obj!.lists.length - 1
							}
							className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
						>
							Next →
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
