import * as React from "react";
import { ProcedureChecklistItem } from "@type/ProcedureChecklist";
import { ProcedureStepItem } from "@type/ProcedureSteps";
import { ProcedureChecklistOverlay } from "@components/procedureChecklist/ProcedureChecklistOverlay";
import { procedureIngestPhaseLabel } from "@components/procedureChecklist/ProcedureChecklistIngestProgressBar";
import { ProcedureStepsApi } from "@api/ProcedureChecklist/ProcedureStepsApi";

const parseMultilineUrls = (raw: string | undefined): string[] => {
	if (!raw) return [];
	return raw
		.split(/\r?\n/)
		.map((s) => s.trim())
		.filter(Boolean);
};

const resolveImageUrlsCarryForward = (
	steps: ProcedureStepItem[],
	idx: number,
): string[] => {
	// If we’re on final slide (idx === steps.length), carry forward from last step
	const start = Math.min(idx, steps.length - 1);
	for (let i = start; i >= 0; i--) {
		const urls = parseMultilineUrls(steps[i]?.images);
		if (urls.length) return urls;
	}
	return [];
};

export type ProcedureChecklistCompactViewProps = {
	selectedProcedure: ProcedureChecklistItem;
	setSelectedProcedure: React.Dispatch<
		React.SetStateAction<ProcedureChecklistItem | undefined>
	>;
	steps: undefined | ProcedureStepItem[];
	setSteps: React.Dispatch<
		React.SetStateAction<ProcedureStepItem[] | undefined>
	>;
	stepIndex: number; // 0..steps.length (steps.length is final slide)
	setStepIndex: React.Dispatch<React.SetStateAction<number>>;
	procedureStepsApi: ProcedureStepsApi;
	editorMode?: boolean;
	reimportBusy?: boolean;
	ingestPercent?: number | null;
	ingestPhase?: string;
	onReimportPdf?: (file: File) => Promise<void>;
};

export const ProcedureChecklistCompactView = ({
	selectedProcedure,
	setSelectedProcedure,
	steps,
	setSteps,
	stepIndex,
	setStepIndex,
	procedureStepsApi,
	editorMode = false,
	reimportBusy = false,
	ingestPercent = null,
	ingestPhase,
	onReimportPdf,
}: ProcedureChecklistCompactViewProps): JSX.Element => {
	const [maximizePurpose, setMaximizePurpose] = React.useState(false);
	const [showOverlay, setShowOverlay] = React.useState<boolean | string>(
		false,
	);
	const [hasUnsavedChanges, setHasUnsavedChangees] = React.useState(false);
	const [imagePageIndex, setImagePageIndex] = React.useState(0);
	const titleRef = React.useRef<HTMLDivElement>(null);
	const textRef = React.useRef<HTMLDivElement>(null);

	const stepsLoading = steps === undefined;
	const stepsOrEmpty = steps ?? [];

	const isFinal = stepIndex >= stepsOrEmpty.length; // final black slide
	const goNext = (): void => {
		if (stepsLoading) return;
		setStepIndex((prev) =>
			prev >= stepsOrEmpty.length ? 0 : prev + 1,
		);
		setHasUnsavedChangees(false);
	};
	const goPrev = (): void => {
		if (stepsLoading) return;
		setStepIndex((prev) =>
			prev <= 0 ? stepsOrEmpty.length : prev - 1,
		);
		setHasUnsavedChangees(false);
	};

	const current = !isFinal ? stepsOrEmpty[stepIndex] : undefined;
	const imageUrls = resolveImageUrlsCarryForward(stepsOrEmpty, stepIndex);
	const boundedImageIndex =
		imageUrls.length === 0
			? 0
			: Math.min(Math.max(imagePageIndex, 0), imageUrls.length - 1);
	const imageUrl = imageUrls[boundedImageIndex] || "";

	React.useEffect(() => {
		// whenever we navigate steps, start from the first image in that step
		setImagePageIndex(0);
	}, [stepIndex]);

	React.useEffect(() => {
		// if list shrinks, keep index in-bounds
		if (imagePageIndex > 0 && boundedImageIndex !== imagePageIndex) {
			setImagePageIndex(boundedImageIndex);
		}
	}, [imageUrls.length, boundedImageIndex, imagePageIndex]);

	const checkForUnsavedChanged = (
		e: React.FormEvent<HTMLDivElement>,
	): void => {
		const lines = titleRef.current!.innerText.split("\n");
		if (lines.length > 1) titleRef.current!.innerText = lines.join(" ");
		setHasUnsavedChangees(
			titleRef.current!.innerText !== current?.title ||
				textRef.current!.innerHTML !== current?.text,
		);
	};

	return (
		<div className="">
			{stepsLoading ? <div>loading...</div> : null}
			<p className="text-xs text-slate-500">
				{editorMode ? (
					<span className="float-right">
						<input
							className="hidden"
							type="file"
							accept="application/pdf,.pdf"
							disabled={reimportBusy || !onReimportPdf}
							onChange={(e) => {
								const input = e.target as HTMLInputElement;
								const file = input.files?.[0];
								input.value = "";
								if (!file || !onReimportPdf) return;
								void onReimportPdf(file);
							}}
							id={`lop-reimport-${selectedProcedure.id}`}
						/>
						<label
							htmlFor={`lop-reimport-${selectedProcedure.id}`}
							className={`cursor-pointer hover:text-blue-500 ${reimportBusy || !onReimportPdf ? "opacity-50" : ""}`}
							title="Replace PDF, refresh list fields, and re-extract steps"
						>
							{reimportBusy
								? ingestPhase === "server"
									? "server…"
									: typeof ingestPercent === "number"
										? `${Math.round(ingestPercent)}%`
										: "re-import…"
								: "re-import"}
							{reimportBusy && ingestPhase ? (
								<span className="ml-1 max-w-[14rem] truncate text-slate-400">
									({procedureIngestPhaseLabel(ingestPhase)})
								</span>
							) : null}
						</label>
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
				<div className="relative text-right font-bold">
					<span className="font-mono text-xs font-medium text-slate-500">
						{isFinal
							? `⟳`
							: `${current?.step ?? stepIndex + 1}/${stepsOrEmpty.length}`}
					</span>
					<span
						title="Download..."
						className="ml-2 cursor-pointer text-center text-xs text-blue-600 hover:underline"
						onClick={() => {
							window.open(selectedProcedure.documentURL);
						}}
					>
						⤓
					</span>
					<span
						title="Fullscreen"
						className="mx-2 cursor-pointer text-center text-xs text-blue-600 hover:underline"
						onClick={() => {
							setShowOverlay(true);
						}}
					>
						⛶
					</span>
				</div>
				<div className="min-h-56 w-full items-center justify-center bg-slate-100">
					<div className="w-full px-6 py-4 text-center">
						<div className="scrollbar-thin flex min-h-48 w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-gradient-to-br from-blue-50 to-slate-100">
							{imageUrl ? (
								<div
									className="inline-block h-[14em] w-[100%] cursor-pointer bg-black/50 text-center outline-1 outline-white"
									style={{
										height:
											imageUrl.split("youtube.com/embed/")
												.length > 1
												? "auto"
												: "300",
									}}
								>
									{imageUrl.split("youtube.com/embed/")
										.length > 1 ? (
										<iframe
											src={imageUrl}
											width="300"
											height="300"
											className="m-auto"
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
						{imageUrls.length > 1 ? (
							<div className="mt-2 flex items-center justify-center gap-3 text-xs text-slate-600">
								<button
									className="rounded border border-slate-300 bg-white px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
									disabled={boundedImageIndex <= 0}
									onClick={() =>
										setImagePageIndex((i) =>
											Math.max(0, i - 1),
										)
									}
								>
									← Prev image
								</button>
								<span className="font-mono">
									{boundedImageIndex + 1}/{imageUrls.length}
								</span>
								<button
									className="rounded border border-slate-300 bg-white px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
									disabled={
										boundedImageIndex >=
										imageUrls.length - 1
									}
									onClick={() =>
										setImagePageIndex((i) =>
											Math.min(
												imageUrls.length - 1,
												i + 1,
											),
										)
									}
								>
									Next image →
								</button>
							</div>
						) : null}
						<div
							ref={titleRef}
							contentEditable={editorMode ?? false}
							className="text-sm font-bold text-black"
							onInput={checkForUnsavedChanged}
						>
							{isFinal ? "Procedure Complete" : current?.title}
						</div>
					</div>
				</div>
				<div className="mt-[-1em] border-t border-slate-300 bg-slate-50 px-4 py-3">
					<div className="flex items-center justify-between">
						<button
							onClick={goPrev}
							className="rounded bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
						>
							← Back
						</button>
						{editorMode ? (
							<span>
								<button
									disabled={!hasUnsavedChanges}
									className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:bg-blue-700 disabled:opacity-50"
									onClick={() => {
										if (!hasUnsavedChanges) return;
										if (stepsLoading || isFinal || !current) return;
										const newTitle =
											titleRef.current!.innerText;
										const newText =
											textRef.current!.innerHTML;
										setTimeout(
											async () =>
												await procedureStepsApi.updateItem(
													current.id,
													{
														Title: newTitle,
														Text: newText,
													} as ProcedureStepItem,
												),
										);
										const s = [...stepsOrEmpty];
										s[stepIndex].title = newTitle;
										s[stepIndex].text = newText;
										setSteps(s);
										setHasUnsavedChangees(false);
									}}
								>
									Save
								</button>{" "}
								<button
									className="cursor-pointer"
									onClick={() =>
										window.open(
											`${location.origin}/sites/${ENV.HUB_NAME}/Lists/${ENV.LIST_PROCEDURESTEPS}/EditForm.aspx?ID=${current!.id}`,
										)
									}
								>
									✎
								</button>
							</span>
						) : (
							<></>
						)}
						<button
							onClick={goNext}
							className="rounded bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
						>
							Next →
						</button>
					</div>
				</div>
				{/* Text panel */}
				<div className="mb-2 ml-[2.5%] w-[95%] justify-center rounded-lg border-2 border-dashed border-slate-300 bg-gradient-to-br from-blue-50 to-slate-100">
					<div className="max-h-[19em] overflow-y-auto px-2 py-2">
						{isFinal ? (
							<div className="mx-auto max-w-md rounded-md bg-black px-4 py-6 text-xs font-semibold text-white">
								Procedure complete.
								<div className="mt-2 text-[11px] font-normal opacity-80">
									Press Next to restart at Step 1.
								</div>
							</div>
						) : (
							<div className="text-sm font-semibold whitespace-pre-wrap text-slate-900">
								<div
									ref={textRef}
									dangerouslySetInnerHTML={{
										__html:
											current?.text || "(No step text)",
									}}
									contentEditable={editorMode ?? false}
									onInput={checkForUnsavedChanged}
								/>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
