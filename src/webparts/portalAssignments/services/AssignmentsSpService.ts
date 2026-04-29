import "@pnp/sp/items";
import "@pnp/sp/lists";
import type { PNPWrapper } from "@utils/PNPWrapper";
import type {
	AssignmentCatalogItem,
	AssignmentStepItem,
	AssignmentQuizQuestion,
	QuizQuestionType,
	UserAssignmentItem,
} from "../types/AssignmentTypes";

function toYesNo(v: unknown): boolean | undefined {
	if (typeof v === "boolean") return v;
	if (typeof v === "number") return v !== 0;
	if (typeof v === "string") {
		const s = v.trim().toLowerCase();
		if (s === "true" || s === "yes" || s === "1") return true;
		if (s === "false" || s === "no" || s === "0") return false;
	}
	return undefined;
}

function safeNumber(v: unknown): number | undefined {
	if (typeof v === "number" && Number.isFinite(v)) return v;
	if (typeof v === "string" && v.trim() !== "") {
		const n = Number(v);
		if (Number.isFinite(n)) return n;
	}
	return undefined;
}

/**
 * SharePoint "percentage" number fields are inconsistent across tenants/API layers:
 * - sometimes stored as 0..1 (Graph)
 * - sometimes stored as 0..100
 * - bad writes can stack-scale (e.g. 100 -> 10000)
 *
 * This normalizes to a UI-friendly 0..100 number.
 */
function normalizePercentCompleteFromSharePoint(
	raw: number | undefined,
): number | undefined {
	if (raw === undefined) return undefined;
	if (!Number.isFinite(raw)) return undefined;

	let n = raw;
	while (n > 100) {
		n = n / 100;
	}

	if (n > 0 && n <= 1) {
		return Math.round(n * 100);
	}

	return Math.round(n);
}

function normalizeEmbedUrls(raw: unknown): string[] {
	if (!raw) return [];
	if (Array.isArray(raw)) {
		return raw
			.map(String)
			.map((s) => s.trim())
			.filter(Boolean);
	}
	if (typeof raw === "string") {
		return raw
			.split(/\r?\n/g)
			.map((s) => s.trim())
			.filter(Boolean);
	}
	return [String(raw)].map((s) => s.trim()).filter(Boolean);
}

function getProp<T>(r: Record<string, unknown>, key: string): T | undefined {
	return r[key] as T | undefined;
}

function getFirstDefined<T>(...vals: Array<T | undefined>): T | undefined {
	for (const v of vals) {
		if (v !== undefined && v !== null) return v;
	}
	return undefined;
}

function toQuizQuestionType(v: unknown): QuizQuestionType {
	return v === "OpenAnswer" ? "OpenAnswer" : "MultipleChoice";
}

export class AssignmentsSpService {
	private pnp: PNPWrapper;
	constructor(pnpWrapper: PNPWrapper) {
		this.pnp = pnpWrapper;
	}

	private web(): ReturnType<PNPWrapper["web"]> {
		return this.pnp.web();
	}

	public statusFieldName(): string {
		return ENV.INTERNALCOLUMN_ASSIGNMENTSTATUS?.trim() || "Status";
	}

	private embedCompletionFieldName(): string {
		return ENV.INTERNALCOLUMN_FINALEMBEDCOMPLETED?.trim() || "";
	}

	public async getMyAssignments(
		email: string,
		limit = 200,
	): Promise<UserAssignmentItem[]> {
		const list = this.web().lists.getByTitle(ENV.LIST_ASSIGNMENTS);
		const statusField = this.statusFieldName();
		const embedField = this.embedCompletionFieldName();

		const rows: Array<Record<string, unknown>> = await list.items
			.select(
				"Id",
				"Title",
				"AssignmentCatalogIdId",
				"EmployeeEmail",
				"Reason",
				"DueDate",
				statusField,
				"CurrentStepOrder",
				"PercentComplete",
				"LastOpenedOn",
				"CompletedOn",
				...(embedField ? [embedField] : []),
			)
			.filter(`EmployeeEmail eq '${email.replace(/'/g, "''")}'`)
			.orderBy("DueDate", true)
			.top(limit)();

		return (rows || []).map((r) => {
			const status =
				getFirstDefined<string>(
					getProp<string>(r, statusField),
					getProp<string>(r, "Status"),
					getProp<string>(r, "AssignmentStatus"),
				) ?? undefined;

			const catalogId = safeNumber(
				getFirstDefined<unknown>(
					getProp<unknown>(r, "AssignmentCatalogIdId"),
					getProp<unknown>(r, "AssignmentCatalogId"),
				),
			);

			return {
				id: getProp<number>(r, "Id") ?? 0,
				title: getProp<string>(r, "Title") ?? "(untitled)",
				assignmentCatalogId: catalogId,
				employeeEmail: getProp<string>(r, "EmployeeEmail"),
				reason: getProp<string>(r, "Reason"),
				dueDate: getProp<string>(r, "DueDate"),
				status,
				currentStepOrder: safeNumber(
					getProp<unknown>(r, "CurrentStepOrder"),
				),
				percentComplete: normalizePercentCompleteFromSharePoint(
					safeNumber(getProp<unknown>(r, "PercentComplete")),
				),
				lastOpenedOn: getProp<string>(r, "LastOpenedOn"),
				completedOn: getProp<string>(r, "CompletedOn"),
				finalEmbedCompleted: embedField
					? toYesNo(getProp<unknown>(r, embedField))
					: undefined,
			};
		});
	}

	public async getAssignmentById(
		id: number,
	): Promise<UserAssignmentItem | undefined> {
		const list = this.web().lists.getByTitle(ENV.LIST_ASSIGNMENTS);
		const statusField = this.statusFieldName();
		const embedField = this.embedCompletionFieldName();

		const r: Record<string, unknown> = await list.items
			.getById(id)
			.select(
				"Id",
				"Title",
				"AssignmentCatalogIdId",
				"EmployeeEmail",
				"Reason",
				"DueDate",
				statusField,
				"CurrentStepOrder",
				"PercentComplete",
				"LastOpenedOn",
				"CompletedOn",
				...(embedField ? [embedField] : []),
			)();

		const status =
			getFirstDefined<string>(
				getProp<string>(r, statusField),
				getProp<string>(r, "Status"),
				getProp<string>(r, "AssignmentStatus"),
			) ?? undefined;

		const catalogId = safeNumber(
			getFirstDefined<unknown>(
				getProp<unknown>(r, "AssignmentCatalogIdId"),
				getProp<unknown>(r, "AssignmentCatalogId"),
			),
		);

		return {
			id: getProp<number>(r, "Id") ?? 0,
			title: getProp<string>(r, "Title") ?? "(untitled)",
			assignmentCatalogId: catalogId,
			employeeEmail: getProp<string>(r, "EmployeeEmail"),
			reason: getProp<string>(r, "Reason"),
			dueDate: getProp<string>(r, "DueDate"),
			status,
			currentStepOrder: safeNumber(
				getProp<unknown>(r, "CurrentStepOrder"),
			),
			percentComplete: normalizePercentCompleteFromSharePoint(
				safeNumber(getProp<unknown>(r, "PercentComplete")),
			),
			lastOpenedOn: getProp<string>(r, "LastOpenedOn"),
			completedOn: getProp<string>(r, "CompletedOn"),
			finalEmbedCompleted: embedField
				? toYesNo(getProp<unknown>(r, embedField))
				: undefined,
		};
	}

	public async getCatalogItemById(
		id: number,
	): Promise<AssignmentCatalogItem | undefined> {
		const list = this.web().lists.getByTitle(ENV.LIST_ASSIGNMENTCATALOG);

		const contentVersionField =
			ENV.INTERNALCOLUMN_CONTENTVERSION?.trim() || "ContentVersion";

		const r: Record<string, unknown> = await list.items
			.getById(id)
			.select(
				"Id",
				"Title",
				"AssignmentKey",
				"Summary",
				"Instructions",
				"Active",
				"EstimatedMinutes",
				"FinalStepCompletionMode",
				"QuizPassingScore",
				contentVersionField,
			)();

		return {
			id: getProp<number>(r, "Id") ?? 0,
			title: getProp<string>(r, "Title") ?? "(untitled)",
			assignmentKey: getProp<string>(r, "AssignmentKey"),
			summary: getProp<string>(r, "Summary"),
			instructions: getProp<string>(r, "Instructions"),
			active: toYesNo(getProp<unknown>(r, "Active")),
			estimatedMinutes: safeNumber(
				getProp<unknown>(r, "EstimatedMinutes"),
			),
			finalStepCompletionMode: getProp<string>(
				r,
				"FinalStepCompletionMode",
			),
			quizPassingScore: safeNumber(
				getProp<unknown>(r, "QuizPassingScore"),
			),
			contentVersion:
				getProp<string | number>(r, contentVersionField) ??
				getProp<string | number>(r, "ContentVersion"),
		};
	}

	public async getQuizQuestionsForCatalog(
		catalogId: number,
		limit = 200,
	): Promise<AssignmentQuizQuestion[]> {
		const quizQuestionsListName = (() => {
			const envVal = (ENV as { LIST_ASSIGNMENTQUIZQUESTIONS?: unknown })
				.LIST_ASSIGNMENTQUIZQUESTIONS;
			return typeof envVal === "string" && envVal.trim()
				? envVal.trim()
				: "AssignmentQuizQuestions";
		})();

		const list = this.web().lists.getByTitle(quizQuestionsListName);

		const baseQuery = list.items.select(
			"Id",
			"AssignmentCatalogId",
			"QuestionOrder",
			"QuestionText",
			"QuestionType",
			"ChoicesText",
			"CorrectAnswer",
			"Explanation",
			"Active",
		);

		let rows: Array<Record<string, unknown>> = [];
		try {
			rows = await baseQuery
				.filter(`AssignmentCatalogId eq ${catalogId}`)
				.orderBy("QuestionOrder", true)
				.top(limit)();
		} catch {
			rows = [];
		}

		if (!rows.length) {
			try {
				const all = await baseQuery
					.orderBy("QuestionOrder", true)
					.top(limit)();
				rows = (all || []).filter(
					(r) =>
						safeNumber(
							getProp<unknown>(r, "AssignmentCatalogId"),
						) === catalogId,
				);
			} catch {
				rows = [];
			}
		}

		const mapped = (rows || [])
			.map((r) => {
				const order =
					safeNumber(getProp<unknown>(r, "QuestionOrder")) ?? 0;

				return {
					id: getProp<number>(r, "Id") ?? 0,
					assignmentCatalogId: catalogId,
					questionOrder: order,
					questionText: getProp<string>(r, "QuestionText") ?? "",
					questionType: toQuizQuestionType(
						getProp<unknown>(r, "QuestionType"),
					),
					choicesText: getProp<string>(r, "ChoicesText"),
					correctAnswer: getProp<string>(r, "CorrectAnswer"),
					explanation: getProp<string>(r, "Explanation"),
					active: toYesNo(getProp<unknown>(r, "Active")),
				} satisfies AssignmentQuizQuestion;
			})
			.filter((q) => q.questionOrder > 0 && q.questionText.trim() !== "");
		return mapped;
	}

	public async getStepsForCatalog(
		catalogId: number,
		limit = 200,
	): Promise<AssignmentStepItem[]> {
		const list = this.web().lists.getByTitle(ENV.LIST_ASSIGNMENTSTEPS);

		const baseQuery = list.items.select(
			"Id",
			"Title",
			"AssignmentCatalogIdId",
			"StepOrder",
			"StepTitle",
			"BodyHtml",
			"EmbedUrl",
			"RequireEmbedCompletion",
			"AllowMarkCompleteHere",
			"EstimatedMinutes",
		);

		let rows: Array<Record<string, unknown>> = [];
		try {
			rows = await baseQuery
				.filter(`AssignmentCatalogIdId eq ${catalogId}`)
				.orderBy("StepOrder", true)
				.top(limit)();
		} catch {
			rows = [];
		}

		if (!rows.length) {
			try {
				const all = await baseQuery
					.orderBy("StepOrder", true)
					.top(limit)();
				rows = (all || []).filter(
					(r) =>
						safeNumber(
							getProp<unknown>(r, "AssignmentCatalogIdId"),
						) === catalogId,
				);
			} catch {
				rows = [];
			}
		}

		return (rows || []).map((r) => {
			const stepOrder = safeNumber(getProp<unknown>(r, "StepOrder")) ?? 0;

			return {
				id: getProp<number>(r, "Id") ?? 0,
				assignmentCatalogId: catalogId,
				stepKey: undefined,
				stepOrder,
				stepTitle: getFirstDefined<string>(
					getProp<string>(r, "StepTitle"),
					getProp<string>(r, "Title"),
				),
				bodyHtml: getProp<string>(r, "BodyHtml"),
				embedUrls: normalizeEmbedUrls(getProp<unknown>(r, "EmbedUrl")),
				requireEmbedCompletion: toYesNo(
					getProp<unknown>(r, "RequireEmbedCompletion"),
				),
				requireStepView: undefined,
				allowMarkCompleteHere: toYesNo(
					getProp<unknown>(r, "AllowMarkCompleteHere"),
				),
				estimatedMinutes: safeNumber(
					getProp<unknown>(r, "EstimatedMinutes"),
				),
			};
		});
	}
}
