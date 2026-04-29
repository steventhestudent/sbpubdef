import * as React from "react";
import RoleBasedViewProps from "@type/RoleBasedViewProps";
import {
	ProcedureChecklistApi,
	ProcedureChecklistIngestApi,
	type IngestProgressReport,
} from "@api/ProcedureChecklist";
import { ProcedureChecklistIngestProgressBar } from "@components/procedureChecklist/ProcedureChecklistIngestProgressBar";
import { ProcedureChecklistItem } from "@type/ProcedureChecklist";
import { ProcedureFilters } from "@components/procedureChecklist/ProcedureFilters";
import { ProcedureChecklistListItem } from "@components/procedureChecklist/ProcedureChecklistListItem";
import { ProcedureChecklistCompactView } from "@components/procedureChecklist/ProcedureChecklistCompactView";
import ClearableInput from "@components/ClearableInput";
import { ProcedureStepItem } from "@type/ProcedureSteps";
import { ProcedureStepsApi } from "@api/ProcedureChecklist/ProcedureStepsApi";

export function ProcedureChecklist({
	pnpWrapper,
}: RoleBasedViewProps): JSX.Element {
	const [editorMode, setEditorMode] = React.useState<boolean>(false);
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
	const [ingestBusy, setIngestBusy] = React.useState(false);
	const [ingestUi, setIngestUi] = React.useState<{
		active: boolean;
		percent: number;
		phase: IngestProgressReport["phase"];
		error: string | undefined;
	}>({
		active: false,
		percent: 0,
		phase: "reading",
		error: undefined,
	});
	const newPdfInputRef = React.useRef<HTMLInputElement>(null);

	const onIngestProgress = React.useCallback((r: IngestProgressReport) => {
		setIngestUi((prev) => ({
			...prev,
			active: true,
			percent: r.percent,
			phase: r.phase,
			error: undefined,
		}));
	}, []);

	const hideIngestBarSoon = React.useCallback(() => {
		window.setTimeout(() => {
			setIngestUi((u) => ({ ...u, active: false }));
		}, 2000);
	}, []);

	const procedureChecklistApi = new ProcedureChecklistApi(pnpWrapper);
	const procedureStepsApi = new ProcedureStepsApi(pnpWrapper);

	const mapFromApi = (
		rows: ProcedureChecklistItem[] | undefined,
	): ProcedureChecklistItem[] =>
		(rows || []).map((item: ProcedureChecklistItem) => ({
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

	const refreshProcedures =
		async (): Promise<ProcedureChecklistItem[]> => {
			const rows = await procedureChecklistApi.get(150);
			const mapped = mapFromApi(rows);
			setProcedures(mapped.length ? mapped : []);
			return mapped;
		};

	const load: () => Promise<void> = async () => {
		const canWrite = await procedureChecklistApi.currentUserCanWrite();
		setEditorMode(canWrite);
		const mapped = mapFromApi(await procedureChecklistApi.get(150));
		setProcedures(mapped.length ? mapped : []);
		setIsLoading(false);
	};

	React.useEffect(() => {
		pnpWrapper.loadCachedThenFresh(load);
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

	const [filterCategory, setFilterCategory] = React.useState<
		string | undefined
	>(undefined);
	const filtered = React.useMemo(() => {
		const term = search.trim().toLowerCase();
		if (!term && !filterCategory) return procedures;
		return procedures.filter((proc) => {
			if (filterCategory && proc.category !== filterCategory)
				return false;
			const haystack = [proc.title, proc.filename, proc.category];
			return haystack
				.filter(Boolean)
				.join(" ")
				.toLowerCase()
				.includes(term);
		});
	}, [search, procedures, filterCategory]);

	const resetFilters = (): void => setFilterCategory(undefined);
	React.useEffect(() => {
		if (selectedProcedure === undefined) resetFilters();
	}, [selectedProcedure]);

	return (
		<section className="p-4 text-sm">
			<ProcedureChecklistIngestProgressBar
				visible={ingestUi.active}
				percent={ingestUi.percent}
				phase={ingestUi.phase}
				error={ingestUi.error}
				onDismissError={() =>
					setIngestUi((u) => ({ ...u, error: undefined }))
				}
			/>
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
					<ProcedureFilters
						procedures={procedures}
						onCategoryChange={(category) => {
							setFilterCategory(category ? category : undefined);
						}}
					/>
					{editorMode ? (
						<span className="float-right">
							<input
								ref={newPdfInputRef}
								type="file"
								accept="application/pdf,.pdf"
								className="hidden"
								disabled={ingestBusy}
								onChange={(e) => {
									const input = e.target as HTMLInputElement;
									const file = input.files?.[0];
									input.value = "";
									if (!file) return;
									setIngestBusy(true);
									setIngestUi({
										active: true,
										percent: 0,
										phase: "reading",
										error: undefined,
									});
									(async () => {
										let succeeded = false;
										try {
											const ingest =
												new ProcedureChecklistIngestApi(
													pnpWrapper.ctx,
												);
											const res =
												await ingest.ingestCreate({
													file,
													onProgress: onIngestProgress,
													fastStart: true,
												});
											const list =
												await refreshProcedures();
											const pid = res.procedureId;
											const row = pid
												? list.find((p) => p.id === pid)
												: undefined;
											if (row) await onProcedureSelected(row);
											succeeded = true;
										} catch (err: unknown) {
											const msg =
												err instanceof Error
													? err.message
													: String(err);
											setIngestUi((u) => ({
												...u,
												active: false,
												error: msg,
											}));
										} finally {
											setIngestBusy(false);
										}
										if (succeeded) hideIngestBarSoon();
									})().catch(() => {
										setIngestBusy(false);
										setIngestUi((u) => ({
											...u,
											active: false,
											error: "Import failed.",
										}));
									});
								}}
							/>
							<span
								className={`cursor-pointer hover:text-blue-500 ${ingestBusy ? "opacity-50" : ""}`}
								title="Import new procedure (PDF)"
								onClick={() => {
									if (!ingestBusy)
										newPdfInputRef.current?.click();
								}}
							>
								{ingestBusy ? "…" : "➕"}
							</span>
						</span>
					) : (
						<></>
					)}
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
											editorMode={editorMode}
											onProcedureDeleted={(proc) =>
												setTimeout(async () => {
													const steps =
														await procedureStepsApi.get(
															999,
															{
																procedureChecklistId:
																	proc.id,
															},
														);
													for (const step of steps) //todo: delete image
														await procedureStepsApi.deleteItem(
															step.id,
														);
													//todo: delete pdf
													await procedureChecklistApi.deleteItem(
														proc.id,
													);
													const a = [...procedures];
													a.splice(
														procedures.indexOf(
															proc,
														),
														1,
													);
													setProcedures(a);
												})
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
							setSteps={setSteps}
							stepIndex={stepIndex}
							setStepIndex={setStepIndex}
							editorMode={editorMode}
							procedureStepsApi={procedureStepsApi}
							reimportBusy={ingestBusy}
							ingestPercent={
								ingestUi.active ? ingestUi.percent : undefined
							}
							ingestPhase={ingestUi.phase}
							onReimportPdf={async (file: File) => {
								setIngestBusy(true);
								setIngestUi({
									active: true,
									percent: 0,
									phase: "reading",
									error: undefined,
								});
								let succeeded = false;
								try {
									const ingest =
										new ProcedureChecklistIngestApi(
											pnpWrapper.ctx,
										);
									await ingest.ingestReimport({
										file,
										procedureId: selectedProcedure.id,
										category: selectedProcedure.category,
										onProgress: onIngestProgress,
										fastStart: true,
									});
									const list = await refreshProcedures();
									const row =
										list.find(
											(p) => p.id === selectedProcedure.id,
										) || selectedProcedure;
									setSelectedProcedure(row);
									const s = await procedureStepsApi.get(999, {
										procedureChecklistId: row.id,
									});
									setSteps(s || []);
									setStepIndex(0);
									succeeded = true;
								} catch (err: unknown) {
									const msg =
										err instanceof Error
											? err.message
											: String(err);
									setIngestUi((u) => ({
										...u,
										active: false,
										error: msg,
									}));
								} finally {
									setIngestBusy(false);
								}
								if (succeeded) hideIngestBarSoon();
							}}
						/>
					)}
				</>
			)}
		</section>
	);
}
