import * as React from "react";
import type { PNPWrapper } from "@utils/PNPWrapper";
import { ContentTable } from "@components/cms/ContentTable";
import { mockRows } from "@components/cms/MockRows";

export function SubmissionsManager({
	sites,
	query,
	pnpWrapper,
}: {
	sites: string[];
	query: string;
	pnpWrapper?: PNPWrapper;
}): JSX.Element {
	const [quizAttempts, setQuizAttempts] = React.useState<
		Array<{
			id: number;
			title: string;
			assignmentId?: number;
			employeeEmail?: string;
			scorePercent?: number;
			passed?: boolean;
			submittedOn?: string;
			answers?: string;
		}>
	>([]);
	const [loadingQuiz, setLoadingQuiz] = React.useState(false);
	const [quizSkip, setQuizSkip] = React.useState(0);
	const quizPageSize = 25;

	async function loadQuizAttempts(reset = false): Promise<void> {
		if (!pnpWrapper) return;
		setLoadingQuiz(true);
		try {
			const web = pnpWrapper.web();
			const listTitle = ENV.LIST_ASSIGNMENTQUIZATTEMPTS;
			const base = web.lists
				.getByTitle(listTitle)
				.items.select(
					"Id",
					"Title",
					"AssignmentId",
					"EmployeeEmail",
					"ScorePercent",
					"Passed",
					"SubmittedOn",
					"Answers",
				)
				.orderBy("Id", false)
				.top(quizPageSize);

			// Some SharePoint endpoints behave oddly with `$skip=0` (returning empty results).
			// Only apply skip when it's actually needed.
			const rows = (await (
				reset ? base : base.skip(quizSkip)
			)()) as Array<Record<string, unknown>>;

			const mapped = (rows || []).map((r) => ({
				id: Number(r.Id),
				title: String(r.Title || ""),
				assignmentId:
					typeof r.AssignmentId === "number"
						? r.AssignmentId
						: typeof r.AssignmentId === "string"
							? Number(r.AssignmentId)
							: undefined,
				employeeEmail:
					typeof r.EmployeeEmail === "string"
						? r.EmployeeEmail
						: undefined,
				scorePercent:
					typeof r.ScorePercent === "number"
						? r.ScorePercent
						: typeof r.ScorePercent === "string"
							? Number(r.ScorePercent)
							: undefined,
				passed:
					typeof r.Passed === "boolean"
						? r.Passed
						: typeof r.Passed === "number"
							? r.Passed !== 0
							: undefined,
				submittedOn:
					typeof r.SubmittedOn === "string"
						? r.SubmittedOn
						: undefined,
				answers: typeof r.Answers === "string" ? r.Answers : undefined,
			}));

			setQuizAttempts((prev) => (reset ? mapped : [...prev, ...mapped]));
			setQuizSkip((prev) => (reset ? quizPageSize : prev + quizPageSize));
		} finally {
			setLoadingQuiz(false);
		}
	}

	React.useEffect(() => {
		if (!pnpWrapper) return;
		loadQuizAttempts(true).catch(() => {});
	}, [pnpWrapper]);

	const items = mockRows("SUB", 10, {
		includeOwner: true,
		includeStatus: true,
	});
	return (
		<div className="space-y-6">
			{pnpWrapper ? (
				<section className="rounded-xl border border-slate-200">
					<header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
						<h3 className="text-base font-semibold text-slate-800">
							Assignment Quiz Attempts
						</h3>
						<button
							className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-white disabled:opacity-50"
							onClick={() => {
								loadQuizAttempts(true).catch(() => {});
							}}
							disabled={loadingQuiz}
						>
							{loadingQuiz ? "Loading…" : "Refresh"}
						</button>
					</header>
					<div className="p-4">
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-slate-200">
								<thead className="bg-slate-50">
									<tr>
										{[
											"ID",
											"AssignmentId",
											"EmployeeEmail",
											"Score",
											"Passed",
											"SubmittedOn",
											"Answers",
										].map((h) => (
											<th
												key={h}
												className="px-4 py-2 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase"
											>
												{h}
											</th>
										))}
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-200">
									{quizAttempts.map((q) => {
										const d = q.submittedOn
											? new Date(q.submittedOn)
											: undefined;
										const submitted =
											d && !Number.isNaN(d.getTime())
												? d.toLocaleString()
												: "—";
										const passedLabel =
											q.passed === undefined
												? "—"
												: q.passed
													? "Yes"
													: "No";
										return (
											<tr
												key={q.id}
												className="hover:bg-slate-50"
											>
												<td className="px-4 py-3 text-xs text-slate-600">
													#{q.id}
												</td>
												<td className="px-4 py-3 text-sm text-slate-700">
													{q.assignmentId ?? "—"}
												</td>
												<td className="px-4 py-3 text-sm text-slate-700">
													{q.employeeEmail || "—"}
												</td>
												<td className="px-4 py-3 text-sm text-slate-700">
													{q.scorePercent ?? "—"}
												</td>
												<td
													className={`px-4 py-3 text-sm ${
														q.passed === false
															? "font-semibold text-red-700"
															: q.passed === true
																? "font-semibold text-emerald-700"
																: "text-slate-700"
													}`}
												>
													{passedLabel}
												</td>
												<td className="px-4 py-3 text-sm text-slate-700">
													{submitted}
												</td>
												<td className="px-4 py-3 text-xs text-slate-600">
													<span className="line-clamp-2 block max-w-[28rem] whitespace-pre-wrap">
														{q.answers || "—"}
													</span>
												</td>
											</tr>
										);
									})}
									{!quizAttempts.length && !loadingQuiz ? (
										<tr>
											<td
												colSpan={7}
												className="px-4 py-6 text-sm text-slate-500"
											>
												No quiz attempts found.
											</td>
										</tr>
									) : null}
								</tbody>
							</table>
						</div>
						<div className="mt-3 flex items-center justify-end">
							<button
								className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-white disabled:opacity-50"
								onClick={() => {
									loadQuizAttempts(false).catch(() => {});
								}}
								disabled={loadingQuiz}
							>
								{loadingQuiz ? "Loading…" : "Load more"}
							</button>
						</div>
					</div>
				</section>
			) : null}

			<ContentTable
				kind="Submission"
				items={items}
				sites={sites}
				query={query}
			/>
		</div>
	);
}
