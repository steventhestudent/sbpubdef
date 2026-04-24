import { AadHttpClient } from "@microsoft/sp-http";
import type { WebPartContext } from "@microsoft/sp-webpart-base";

/** Payload returned from Azure Function `PortalAssignmentsMutate` (subset of list fields). */
export type AssignmentMutationResult = {
	id: number;
	employeeEmail?: string;
	dueDate?: string;
	currentStepOrder?: number;
	percentComplete?: number;
	status?: string;
	lastOpenedOn?: string;
	completedOn?: string;
	finalEmbedCompleted?: boolean;
	quizPassed?: boolean;
	quizScorePercent?: number;
};

export type QuizAttemptResult = {
	scorePercent: number;
	passed: boolean;
	submittedOn: string;
	/** 1-based count for this user + assignment (new row each submit). */
	attemptNumber?: number;
};

export class AssignmentsMutationsApi {
	constructor(private readonly context: WebPartContext) {}

	private async post<T>(body: Record<string, unknown>): Promise<T> {
		const client: AadHttpClient = await this.context.aadHttpClientFactory.getClient(
			ENV.FUNCTION_API_APP_ID,
		);
		const base = (ENV.FUNCTION_BASE_URL || "").replace(/\/$/, "");
		const url = `${base}/api/PortalAssignmentsMutate`;
		const res = await client.post(url, AadHttpClient.configurations.v1, {
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});
		const text = await res.text();
		if (!res.ok) {
			let msg = text;
			let debugPayload: unknown | undefined = undefined;
			try {
				const j = JSON.parse(text) as { error?: string; debug?: unknown };
				if (j.error) msg = j.error;
				if (j.debug !== undefined) debugPayload = j.debug;
			} catch {
				// ignore
			}
			if (debugPayload !== undefined) {
				// eslint-disable-next-line no-console
				console.error("PortalAssignmentsMutate debug payload", {
					requestBody: body,
					debug: debugPayload,
					rawResponseText: text,
					status: res.status,
				});
				if (msg && !/see console/i.test(msg)) msg = `${msg} (see console for debug details)`;
			}
			throw new Error(msg || `Assignment mutation failed (${res.status})`);
		}
		return JSON.parse(text) as T;
	}

	async start(assignmentId: number): Promise<AssignmentMutationResult> {
		const json = await this.post<{ assignment?: AssignmentMutationResult }>({
			action: "start",
			assignmentId,
		});
		if (!json.assignment) throw new Error("Assignment mutation returned no assignment payload.");
		return json.assignment;
	}

	async progress(assignmentId: number, currentStepOrder: number): Promise<AssignmentMutationResult> {
		const json = await this.post<{ assignment?: AssignmentMutationResult }>({
			action: "progress",
			assignmentId,
			currentStepOrder,
		});
		if (!json.assignment) throw new Error("Assignment mutation returned no assignment payload.");
		return json.assignment;
	}

	async finalEmbed(assignmentId: number): Promise<AssignmentMutationResult> {
		const json = await this.post<{ assignment?: AssignmentMutationResult }>({
			action: "final_embed",
			assignmentId,
		});
		if (!json.assignment) throw new Error("Assignment mutation returned no assignment payload.");
		return json.assignment;
	}

	async complete(assignmentId: number): Promise<AssignmentMutationResult> {
		const json = await this.post<{ assignment?: AssignmentMutationResult }>({
			action: "complete",
			assignmentId,
		});
		if (!json.assignment) throw new Error("Assignment mutation returned no assignment payload.");
		return json.assignment;
	}

	async submitQuiz(
		assignmentId: number,
		answersByOrder: Record<number, string>,
	): Promise<{ assignment: AssignmentMutationResult; attempt: QuizAttemptResult }> {
		const json = await this.post<{
			assignment?: AssignmentMutationResult;
			attempt?: QuizAttemptResult;
		}>({
			action: "submit_quiz",
			assignmentId,
			answers: answersByOrder,
		});
		if (!json.assignment) throw new Error("Quiz submission returned no assignment payload.");
		if (!json.attempt) throw new Error("Quiz submission returned no attempt payload.");
		return { assignment: json.assignment, attempt: json.attempt };
	}
}
