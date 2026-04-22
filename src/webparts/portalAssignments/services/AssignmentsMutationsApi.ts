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
};

export class AssignmentsMutationsApi {
	constructor(private readonly context: WebPartContext) {}

	private async post(body: Record<string, unknown>): Promise<AssignmentMutationResult> {
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
			try {
				const j = JSON.parse(text) as { error?: string };
				if (j.error) msg = j.error;
			} catch {
				// ignore
			}
			throw new Error(msg || `Assignment mutation failed (${res.status})`);
		}
		const json = JSON.parse(text) as { assignment?: AssignmentMutationResult };
		if (!json.assignment) {
			throw new Error("Assignment mutation returned no assignment payload.");
		}
		return json.assignment;
	}

	start(assignmentId: number): Promise<AssignmentMutationResult> {
		return this.post({ action: "start", assignmentId });
	}

	progress(assignmentId: number, currentStepOrder: number): Promise<AssignmentMutationResult> {
		return this.post({ action: "progress", assignmentId, currentStepOrder });
	}

	finalEmbed(assignmentId: number): Promise<AssignmentMutationResult> {
		return this.post({ action: "final_embed", assignmentId });
	}

	complete(assignmentId: number): Promise<AssignmentMutationResult> {
		return this.post({ action: "complete", assignmentId });
	}
}
