import * as React from "react";
import { ProcedureChecklistItem } from "@type/ProcedureChecklist";
import { ProcedureStepItem } from "@type/ProcedureSteps";
import { ProcedureChecklistOverlay } from "@components/procedureChecklist/ProcedureChecklistOverlay";

const normalizeFirstUrl = (raw: string | undefined): string => {
	if (!raw) return "";
	// since Images is multiline text, take first non-empty line
	const first = raw
		.split(/\r?\n/)
		.map((s) => s.trim())
		.find(Boolean);
	return first || "";
};

const resolveImageUrlCarryForward = (
	steps: ProcedureStepItem[],
	idx: number,
): string => {
	// If we’re on final slide (idx === steps.length), carry forward from last step
	const start = Math.min(idx, steps.length - 1);
	for (let i = start; i >= 0; i--) {
		const url = normalizeFirstUrl(steps[i]?.images);
		if (url) return url;
	}
	return "";
};

export const ProcedureChecklistCompactView = ({
	selectedProcedure,
	setSelectedProcedure,
	steps,
	stepIndex,
	setStepIndex,
	editorMode = false,
}: {
	selectedProcedure: ProcedureChecklistItem;
	setSelectedProcedure: React.Dispatch<
		React.SetStateAction<ProcedureChecklistItem | undefined>
	>;
	steps: undefined | ProcedureStepItem[];
	stepIndex: number; // 0..steps.length (steps.length is final slide)
	setStepIndex: React.Dispatch<React.SetStateAction<number>>;
	editorMode?: boolean;
}): JSX.Element => {
	const [maximizePurpose, setMaximizePurpose] = React.useState(false);
	const [showOverlay, setShowOverlay] = React.useState<boolean | string>(
		false,
	);
	if (steps === undefined) return <div>loading...</div>;

	const isFinal = stepIndex >= steps.length; // final black slide
	const goNext = (): void =>
		setStepIndex((prev) => (prev >= steps.length ? 0 : prev + 1));
	const goPrev = (): void =>
		setStepIndex((prev) => (prev <= 0 ? steps.length : prev - 1));

	const current = !isFinal ? steps[stepIndex] : undefined;
	const imageUrl = resolveImageUrlCarryForward(steps, stepIndex);

	return (
		<div className="">
			<p className="text-xs text-slate-500">
				{editorMode ? (
					<span
						className="float-right cursor-pointer hover:text-blue-500"
						onClick={(e) =>
							(
								(e.target as HTMLSpanElement)
									.children[0] as HTMLInputElement
							).click()
						}
					>
						<input
							className="hidden"
							type="file"
							onChange={() => console.log(`ok`)}
							// ref={fileInputRef}
						/>
						re-import
					</span>
				) : (
					<></>
				)}
			</p>
			<h2 className="mt-0">
				<button
					onClick={() => setSelectedProcedure(undefined)}
					className="text-sm text-blue-600 hover:underline"
				>
					Procedures ← &nbsp;
				</button>
				{selectedProcedure.title || selectedProcedure.filename}
			</h2>
			{selectedProcedure.effectiveDate ? (
				<>
					<b>Effective Date:</b> {selectedProcedure.effectiveDate}
				</>
			) : (
				<></>
			)}
			<br />
			{selectedProcedure.purpose ? (
				<>
					<b>Purpose:</b>
				</>
			) : (
				<></>
			)}
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
			<div
				className="relative"
				style={{
					overflow: maximizePurpose ? "auto" : "hidden",
					maxHeight: maximizePurpose ? "inherit" : "2.8em",
				}}
				title={selectedProcedure.purpose}
			>
				{selectedProcedure.purpose}
				{selectedProcedure.purpose && maximizePurpose ? (
					<div
						className="float-right mb-2 cursor-pointer text-blue-500 hover:underline"
						onClick={() => setMaximizePurpose(false)}
					>
						Show Less...
					</div>
				) : (
					<></>
				)}
			</div>
			{selectedProcedure.purpose && !maximizePurpose ? (
				<div
					className="mb-2 cursor-pointer text-right text-blue-500 hover:underline"
					onClick={() => setMaximizePurpose(true)}
				>
					Show More...
				</div>
			) : (
				<></>
			)}
			<div className="overflow-hidden rounded-md border border-slate-400 bg-white">
				<div className="relative text-center font-bold">
					<div className="absolute top-[2px] right-1">
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
					{isFinal ? "Procedure Complete" : current?.title}
				</div>
				<div className="min-h-64 w-full items-center justify-center bg-slate-100">
					<div className="w-full p-6 text-center">
						<div className="scrollbar-thin flex min-h-48 w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-gradient-to-br from-blue-50 to-slate-100">
							{imageUrl ? (
								<div className="inline-block h-[14em] w-[100%] cursor-pointer bg-black/50 outline-1 outline-white">
									{imageUrl.split("youtube.com/embed/")
										.length > 1 ? (
										<iframe
											src={imageUrl}
											width="300"
											height="300"
											onMouseDown={() =>
												setShowOverlay(imageUrl)
											}
										/>
									) : (
										<img
											src={imageUrl}
											className="h-full w-full"
											title={imageUrl}
											onClick={() =>
												setShowOverlay(imageUrl)
											}
											style={{ opacity: isFinal ? 0 : 1 }}
										/>
									)}
								</div>
							) : (
								<div className="text-xs text-slate-500">
									No image available yet.
								</div>
							)}
						</div>
						<div className="text-right text-sm font-medium text-slate-500">
							{isFinal
								? `⟳`
								: `${current?.step ?? stepIndex + 1}/${steps.length}`}
						</div>
					</div>
				</div>
				<div className="mt-[-1em] border-t border-slate-300 bg-slate-50 px-4 py-3">
					<div className="flex items-center justify-between">
						<button
							onClick={goPrev}
							className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
						>
							← Back
						</button>
						<button
							onClick={goNext}
							className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
						>
							Next →
						</button>
					</div>
				</div>
				{/* Text panel */}
				<div className="mb-2 ml-[5%] w-[90%] justify-center rounded-lg border-2 border-dashed border-slate-300 bg-gradient-to-br from-blue-50 to-slate-100">
					<div className="max-h-[19em] overflow-y-auto px-4 py-4">
						{isFinal ? (
							<div className="mx-auto max-w-md rounded-md bg-black px-4 py-6 text-xs font-semibold text-white">
								Procedure complete.
								<div className="mt-2 text-[11px] font-normal opacity-80">
									Press Next to restart at Step 1.
								</div>
							</div>
						) : (
							<div className="mx-auto max-w-md text-xs font-semibold whitespace-pre-wrap text-slate-900">
								<div
									dangerouslySetInnerHTML={{
										__html:
											current?.text || "(No step text)",
									}}
								/>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
