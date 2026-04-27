import * as React from "react";
import type { AssignmentsSpService } from "../services/AssignmentsSpService";
import type {
	AssignmentMutationResult,
	AssignmentsMutationsApi,
} from "../services/AssignmentsMutationsApi";
import type {
	AssignmentCatalogItem,
	AssignmentQuizQuestion,
	AssignmentStepItem,
	UserAssignmentItem,
} from "../types/AssignmentTypes";
import { EmbedPlayer } from "./EmbedPlayer";
import { AssignmentFlowQuizPane } from "@components/portalAssignments/AssignmentFlowQuizPane";
import { AssignmentFlowSidebar } from "@components/portalAssignments/AssignmentFlowSidebar";

function clamp(n: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, n));
}

function asDateLabel(iso?: string): string {
	if (!iso) return "—";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "—";
	return d.toLocaleDateString();
}

function isVideoLikeEmbed(url: string): boolean {
	return (
		/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\b/i.test(
			url,
		) || /\.(mp4|webm|ogg)(\?|#|$)/i.test(url)
	);
}

function mergeAssignment(
	prev: UserAssignmentItem,
	patch: AssignmentMutationResult,
): UserAssignmentItem {
	return {
		...prev,
		id: patch.id,
		currentStepOrder: patch.currentStepOrder ?? prev.currentStepOrder,
		percentComplete: patch.percentComplete ?? prev.percentComplete,
		status: (patch.status as UserAssignmentItem["status"]) ?? prev.status,
		lastOpenedOn: patch.lastOpenedOn ?? prev.lastOpenedOn,
		completedOn: patch.completedOn ?? prev.completedOn,
		finalEmbedCompleted:
			patch.finalEmbedCompleted ?? prev.finalEmbedCompleted,
		quizPassed: patch.quizPassed ?? prev.quizPassed,
		quizScorePercent: patch.quizScorePercent ?? prev.quizScorePercent,
	};
}

export function AssignmentFlow({
	svc,
	mutations,
	assignment,
	onBack,
	onUpdated,
}: {
	svc: AssignmentsSpService;
	mutations: AssignmentsMutationsApi;
	assignment: UserAssignmentItem;
	onBack: () => void;
	onUpdated: (next: UserAssignmentItem) => void;
}): JSX.Element {
	const [catalog, setCatalog] = React.useState<
		AssignmentCatalogItem | undefined
	>(undefined);
	const [steps, setSteps] = React.useState<AssignmentStepItem[]>([]);
	const [quiz, setQuiz] = React.useState<AssignmentQuizQuestion[]>([]);
	const [answers, setAnswers] = React.useState<Record<number, string>>({});
	const [quizResult, setQuizResult] = React.useState<
		| { passed: boolean; scorePercent: number; attemptNumber?: number }
		| undefined
	>(undefined);
	const [submittingQuiz, setSubmittingQuiz] = React.useState(false);
	const [loading, setLoading] = React.useState(true);
	const [err, setErr] = React.useState<string | undefined>(undefined);

	const [activeOrder, setActiveOrder] = React.useState<number>(
		assignment.currentStepOrder ?? 1,
	);
	const [pane, setPane] = React.useState<"step" | "quiz">("step");
	const [quizUnlocked, setQuizUnlocked] = React.useState(false);
	const [finalEmbedDone, setFinalEmbedDone] = React.useState<boolean>(
		assignment.finalEmbedCompleted === true,
	);
	const [embedDoneByStep, setEmbedDoneByStep] = React.useState<
		Record<number, boolean>
	>({});
	const [saving, setSaving] = React.useState(false);
	const startedForId = React.useRef<number | null>(null);

	React.useEffect(() => {
		setFinalEmbedDone(assignment.finalEmbedCompleted === true);
	}, [assignment.id, assignment.finalEmbedCompleted]);

	React.useEffect(() => {
		let cancelled = false;
		(async (): Promise<void> => {
			setLoading(true);
			setErr(undefined);
			try {
				if (!assignment.assignmentCatalogId)
					throw new Error(
						"AssignmentCatalogId missing on assignment item.",
					);
				const [c, s] = await Promise.all([
					svc.getCatalogItemById(assignment.assignmentCatalogId),
					svc.getStepsForCatalog(assignment.assignmentCatalogId),
				]);
				if (cancelled) return;
				setCatalog(c);
				setSteps(s);
				setQuiz([]);
				setAnswers({});
				setQuizResult(undefined);
				setEmbedDoneByStep({});
				setPane("step");
				setQuizUnlocked(false);
				const maxOrder = s.length
					? Math.max(...s.map((x) => x.stepOrder))
					: 1;
				setActiveOrder(
					clamp(assignment.currentStepOrder ?? 1, 1, maxOrder),
				);
			} catch (e: unknown) {
				const msg =
					e instanceof Error
						? e.message
						: "Failed to load assignment.";
				setErr(msg);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})().catch(() => undefined);
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [assignment.id]);

	React.useEffect(() => {
		if (loading || !catalog || !assignment.id) return;
		if (String(assignment.status || "").toLowerCase() === "completed")
			return;
		if (startedForId.current === assignment.id) return;
		startedForId.current = assignment.id;
		(async (): Promise<void> => {
			try {
				const patch = await mutations.start(assignment.id);
				onUpdated(mergeAssignment(assignment, patch));
			} catch (e: unknown) {
				startedForId.current = null;
				const msg =
					e instanceof Error
						? e.message
						: "Failed to record assignment start.";
				setErr(msg);
			}
		})().catch(() => undefined);
	}, [assignment, catalog, loading, mutations, onUpdated]);

	const stepByOrder = React.useMemo(() => {
		const map = new Map<number, AssignmentStepItem>();
		for (const s of steps) map.set(s.stepOrder, s);
		return map;
	}, [steps]);

	const maxStepOrder = React.useMemo(() => {
		return steps.length ? Math.max(...steps.map((s) => s.stepOrder)) : 1;
	}, [steps]);

	const activeStep = stepByOrder.get(activeOrder);
	const isFinalStep = activeOrder === maxStepOrder;

	const stepRequiresEmbedCompletion = !!activeStep?.requireEmbedCompletion;
	const stepHasVideoEmbed = !!activeStep?.embedUrls?.some((u) =>
		isVideoLikeEmbed(u),
	);
	const stepEmbedRequired = stepRequiresEmbedCompletion && stepHasVideoEmbed;
	const stepEmbedDone = !!embedDoneByStep[activeOrder];
	const stepNavigationBlocked = stepEmbedRequired && !stepEmbedDone;

	React.useEffect(() => {
		const catalogId = assignment.assignmentCatalogId;
		if (!catalogId) return;
		let cancelled = false;
		(async (): Promise<void> => {
			try {
				const qs = await svc.getQuizQuestionsForCatalog(catalogId);
				if (cancelled) return;
				const active = (qs || []).filter((q) => q.active !== false);
				setQuiz(active);
			} catch {
				// quiz is optional
				setQuiz([]);
			}
		})().catch(() => undefined);
		return () => {
			cancelled = true;
		};
	}, [assignment.assignmentCatalogId, svc]);

	const requiresFinalEmbed =
		(catalog?.finalStepCompletionMode ?? "")
			.toLowerCase()
			.includes("require") ||
		(activeStep?.requireEmbedCompletion && isFinalStep);

	const completionMode = String(
		catalog?.finalStepCompletionMode ?? "Manual",
	).trim();
	const requiresQuizPass =
		/afterquizpass/i.test(completionMode) ||
		/afterfinalembedandquizpass/i.test(completionMode);
	const requiresEmbed =
		/afterfinalembed/i.test(completionMode) ||
		/afterfinalembedandquizpass/i.test(completionMode) ||
		requiresFinalEmbed;

	const passingScore = catalog?.quizPassingScore ?? 70;
	const quizPassed = quizResult?.passed ?? assignment.quizPassed ?? false;
	const hasQuiz = requiresQuizPass || quiz.length > 0;

	const completionBlockReason = React.useMemo(() => {
		if (!isFinalStep) return "Finish the final step to mark complete.";
		if (!(activeStep?.allowMarkCompleteHere ?? true))
			return "This step does not allow completion here.";
		if (requiresEmbed && !finalEmbedDone)
			return "Finish the required embed watch-time to unlock completion.";
		if (requiresQuizPass && !quizPassed)
			return `Submit and pass the quiz (≥ ${passingScore}%) to unlock completion.`;
		return undefined;
	}, [
		activeStep?.allowMarkCompleteHere,
		finalEmbedDone,
		isFinalStep,
		passingScore,
		quizPassed,
		requiresEmbed,
		requiresQuizPass,
	]);

	const canMarkComplete =
		isFinalStep &&
		(activeStep?.allowMarkCompleteHere ?? true) &&
		(!requiresEmbed || finalEmbedDone) &&
		(!requiresQuizPass || quizPassed);

	async function persistProgress(nextOrder: number): Promise<void> {
		if (!assignment.id) return;
		const maxAllowed = Math.max(1, maxStepOrder);
		const safe = clamp(nextOrder, 1, maxAllowed);
		if (safe !== nextOrder) {
			setActiveOrder(safe);
		}
		setSaving(true);
		try {
			const patch = await mutations.progress(assignment.id, safe);
			onUpdated(mergeAssignment(assignment, patch));
		} finally {
			setSaving(false);
		}
	}

	function goToQuiz(): void {
		setQuizUnlocked(true);
		setPane("quiz");
	}

	async function persistFinalEmbedDone(): Promise<void> {
		if (finalEmbedDone) return;
		setSaving(true);
		setErr(undefined);
		try {
			const patch = await mutations.finalEmbed(assignment.id);
			setFinalEmbedDone(true);
			onUpdated(mergeAssignment(assignment, patch));
		} catch (e: unknown) {
			const msg =
				e instanceof Error
					? e.message
					: "Failed to record final embed completion.";
			setErr(msg);
			throw e;
		} finally {
			setSaving(false);
		}
	}

	async function markComplete(): Promise<void> {
		if (!canMarkComplete) return;
		setSaving(true);
		try {
			const patch = await mutations.complete(assignment.id);
			onUpdated(mergeAssignment(assignment, patch));
		} finally {
			setSaving(false);
		}
	}

	async function submitQuiz(): Promise<void> {
		if (!assignment.id) return;
		setSubmittingQuiz(true);
		setErr(undefined);
		try {
			const { assignment: patch, attempt } = await mutations.submitQuiz(
				assignment.id,
				answers,
			);
			const merged = mergeAssignment(assignment, patch);
			setQuizResult({
				passed: attempt.passed,
				scorePercent: attempt.scorePercent,
				attemptNumber: attempt.attemptNumber,
			});
			onUpdated(merged);

			// Same completion path as "Mark Complete" when catalog mode is satisfied after a passing quiz.
			if (attempt.passed) {
				const mode = (catalog?.finalStepCompletionMode ?? "")
					.trim()
					.toLowerCase();
				const embedOk = !requiresEmbed || finalEmbedDone;
				const afterQuizOnly = mode === "afterquizpass";
				const afterEmbedAndQuiz =
					/afterfinalembedandquizpass/.test(mode) && embedOk;
				if (afterQuizOnly || afterEmbedAndQuiz) {
					setSaving(true);
					try {
						const completePatch = await mutations.complete(
							assignment.id,
						);
						onUpdated(mergeAssignment(merged, completePatch));
					} catch (e: unknown) {
						const msg =
							e instanceof Error
								? e.message
								: "Failed to finalize assignment after quiz.";
						setErr(msg);
					} finally {
						setSaving(false);
					}
				}
			}
		} catch (e: unknown) {
			const msg =
				e instanceof Error ? e.message : "Failed to submit quiz.";
			setErr(msg);
		} finally {
			setSubmittingQuiz(false);
		}
	}

	if (loading) {
		return (
			<div className="p-4">
				<button
					className="text-sm text-blue-700 hover:underline"
					onClick={onBack}
				>
					← Back
				</button>
				<div className="mt-3 text-sm text-slate-600">
					Loading assignment…
				</div>
			</div>
		);
	}

	if (err) {
		return (
			<div className="p-4">
				<button
					className="text-sm text-blue-700 hover:underline"
					onClick={onBack}
				>
					← Back
				</button>
				<div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
					{err}
				</div>
			</div>
		);
	}

	return (
		<div className="p-4">
			<div className="flex items-start justify-between gap-3">
				<div>
					<button
						className="text-sm text-blue-700 hover:underline"
						onClick={onBack}
					>
						← Back
					</button>
					<div className="mt-2 text-lg font-semibold text-slate-900">
						{catalog?.title ?? assignment.title}
					</div>
					<div className="mt-1 text-sm text-slate-600">
						Due {asDateLabel(assignment.dueDate)} • Status{" "}
						<span className="font-medium text-slate-800">
							{assignment.status ?? "—"}
						</span>
						{saving ? (
							<span className="ml-2 text-xs text-slate-500">
								Saving…
							</span>
						) : null}
					</div>
				</div>
				<div className="text-right">
					<div className="text-xs text-slate-500">Progress</div>
					<div className="text-sm font-semibold text-slate-800">
						{assignment.percentComplete ?? 0}%
					</div>
				</div>
			</div>

			{catalog?.instructions ? (
				<div
					className="prose mt-3 max-w-none rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800"
					dangerouslySetInnerHTML={{ __html: catalog.instructions }}
				/>
			) : null}

			<div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[240px_1fr]">
				<AssignmentFlowSidebar
					steps={steps}
					activeOrder={activeOrder}
					setActiveOrder={setActiveOrder}
					persistProgress={persistProgress}
					pane={pane}
					setPane={setPane}
					assignment={assignment}
					stepNavigationBlocked={stepNavigationBlocked}
					hasQuiz={hasQuiz}
					quizUnlocked={quizUnlocked}
					maxStepOrder={maxStepOrder}
				/>

				<main className="rounded-lg border border-slate-200 bg-white p-3">
					{pane === "quiz" ? (
						<AssignmentFlowQuizPane
							quiz={quiz}
							answers={answers}
							setAnswers={setAnswers}
							quizResult={quizResult}
							submittingQuiz={submittingQuiz}
							submitQuiz={submitQuiz}
							passingScore={passingScore}
							onBackToSteps={() => setPane("step")}
						/>
					) : (
						<>
							<div className="flex items-center justify-between gap-2">
								<div className="text-base font-semibold text-slate-900">
									{activeStep?.stepTitle ?? "Step"}
								</div>
								<div className="flex items-center gap-2">
									<button
										className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
										disabled={
											activeOrder <= 1 ||
											stepNavigationBlocked
										}
										onClick={async () => {
											const next = clamp(
												activeOrder - 1,
												1,
												maxStepOrder,
											);
											setActiveOrder(next);
											await persistProgress(next);
										}}
									>
										Prev
									</button>
									<button
										className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
										disabled={
											stepNavigationBlocked ||
											(activeOrder >= maxStepOrder &&
												!hasQuiz)
										}
										onClick={async () => {
											if (
												activeOrder >= maxStepOrder &&
												hasQuiz
											) {
												goToQuiz();
												return;
											}
											const next = clamp(
												activeOrder + 1,
												1,
												maxStepOrder,
											);
											setActiveOrder(next);
											await persistProgress(next);
										}}
									>
										{activeOrder >= maxStepOrder && hasQuiz
											? "Go to Quiz"
											: "Next"}
									</button>
								</div>
							</div>

							{activeStep?.bodyHtml ? (
								<div
									className="prose mt-3 max-w-none text-sm text-slate-800"
									dangerouslySetInnerHTML={{
										__html: activeStep.bodyHtml,
									}}
								/>
							) : (
								<div className="mt-3 text-sm text-slate-500 italic">
									No content for this step.
								</div>
							)}

							{activeStep?.embedUrls?.length ? (
								<div className="mt-4 space-y-4">
									{activeStep.embedUrls.map((u, idx) => (
										<EmbedPlayer
											key={idx}
											url={u}
											title={`Embed ${idx + 1}`}
											requiredSeconds={
												activeStep.requireEmbedCompletion &&
												activeStep.estimatedMinutes
													? Math.max(
															0,
															activeStep.estimatedMinutes,
														) * 60
													: undefined
											}
											debugKey={`step${activeOrder}-embed${idx + 1}`}
											onCompleted={() => {
												setEmbedDoneByStep((prev) => ({
													...prev,
													[activeOrder]: true,
												}));
												if (
													isFinalStep &&
													requiresFinalEmbed
												)
													persistFinalEmbedDone().catch(
														() => undefined,
													);
											}}
										/>
									))}
									{stepEmbedRequired && !stepEmbedDone ? (
										<div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
											Watch at least{" "}
											<span className="font-semibold">
												{activeStep?.estimatedMinutes ??
													0}{" "}
												minutes
											</span>{" "}
											to continue.
										</div>
									) : null}
								</div>
							) : null}
						</>
					)}

					<div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
						<div className="text-xs text-slate-500">
							{pane === "quiz"
								? `Quiz (${maxStepOrder + 1} of ${maxStepOrder + 1})`
								: `Step ${activeOrder} of ${maxStepOrder}`}
						</div>
						{!canMarkComplete && completionBlockReason ? (
							<div className="text-xs text-amber-800">
								{completionBlockReason}
							</div>
						) : null}
						<button
							className={[
								"rounded-md px-3 py-2 text-sm font-semibold",
								canMarkComplete
									? "bg-green-600 text-white hover:bg-green-700"
									: "cursor-not-allowed bg-slate-200 text-slate-500",
							].join(" ")}
							disabled={!canMarkComplete}
							onClick={() => {
								markComplete().catch(() => undefined);
							}}
						>
							Mark Complete
						</button>
					</div>
				</main>
			</div>
		</div>
	);
}
