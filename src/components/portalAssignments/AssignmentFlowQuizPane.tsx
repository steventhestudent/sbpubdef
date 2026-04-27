import * as React from "react";
import type { AssignmentQuizQuestion } from "../../webparts/portalAssignments/types/AssignmentTypes";

export function AssignmentFlowQuizPane({
	quiz,
	answers,
	setAnswers,
	quizResult,
	submittingQuiz,
	submitQuiz,
	passingScore,
	onBackToSteps,
}: {
	quiz: AssignmentQuizQuestion[];
	answers: Record<number, string>;
	setAnswers: React.Dispatch<React.SetStateAction<Record<number, string>>>;
	quizResult:
		| { passed: boolean; scorePercent: number; attemptNumber?: number }
		| undefined;
	submittingQuiz: boolean;
	submitQuiz: () => Promise<void>;
	passingScore: number;
	onBackToSteps: () => void;
}): JSX.Element {
	return (
		<div>
			<div className="flex items-center justify-between gap-2">
				<div className="text-base font-semibold text-slate-900">Quiz</div>
				<button
					className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
					onClick={onBackToSteps}
				>
					← Back to steps
				</button>
			</div>

			<div className="mt-1 text-xs text-slate-600">
				Passing score:{" "}
				<span className="font-semibold">{passingScore}%</span>
			</div>

			{quiz.length === 0 ? (
				<div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
					No quiz questions found for this assignment.
				</div>
			) : (
				<>
					<div className="mt-3 space-y-4">
						{quiz.map((q) => {
							const val = answers[q.questionOrder] ?? "";
							const type = String(q.questionType || "MultipleChoice");
							const choices = (q.choicesText || "")
								.split(/\r?\n/g)
								.map((s) => s.trim())
								.filter(Boolean);
							return (
								<div
									key={q.id}
									className="rounded-md border border-slate-200 bg-white p-3"
								>
									<div className="text-sm font-semibold text-slate-900">
										{q.questionOrder}. {q.questionText}
									</div>
									{type.toLowerCase() === "openanswer" ? (
										<textarea
											className="mt-2 w-full rounded-md border border-slate-200 p-2 text-sm"
											rows={3}
											value={val}
											onChange={(e) =>
												setAnswers((prev) => ({
													...prev,
													[q.questionOrder]: e.target.value,
												}))
											}
											placeholder="Type your answer…"
										/>
									) : (
										<div className="mt-2 space-y-2">
											{choices.map((c) => {
												const key = c.split(".")[0]?.trim() || c;
												return (
													<label
														key={c}
														className="flex items-start gap-2 text-sm text-slate-800"
													>
														<input
															type="radio"
															name={`q-${q.id}`}
															checked={val === key}
															onChange={() =>
																setAnswers((prev) => ({
																	...prev,
																	[q.questionOrder]: key,
																}))
															}
														/>
														<span>{c}</span>
													</label>
												);
											})}
										</div>
									)}
								</div>
							);
						})}
					</div>

					<div className="mt-3 flex items-center justify-between gap-3">
						<div className="text-xs text-slate-600">
							{quizResult ? (
								<>
									{quizResult.attemptNumber !== undefined ? (
										<>
											Attempt{" "}
											<span className="font-semibold">
												{quizResult.attemptNumber}
											</span>
											{" · "}
										</>
									) : null}
									Score:{" "}
									<span className="font-semibold">
										{quizResult.scorePercent}%
									</span>{" "}
									{quizResult.passed ? (
										<span className="font-semibold text-green-700">
											Passed
										</span>
									) : (
										<span className="font-semibold text-red-700">
											Not passed
										</span>
									)}
								</>
							) : (
								<span>Submit your answers to score this quiz.</span>
							)}
						</div>
						<button
							className={[
								"rounded-md px-3 py-2 text-sm font-semibold",
								submittingQuiz
									? "cursor-wait bg-slate-200 text-slate-500"
									: "bg-blue-600 text-white hover:bg-blue-700",
							].join(" ")}
							disabled={submittingQuiz}
							onClick={() => submitQuiz().catch(() => undefined)}
						>
							{submittingQuiz ? "Submitting…" : "Submit Quiz"}
						</button>
					</div>
				</>
			)}
		</div>
	);
}

