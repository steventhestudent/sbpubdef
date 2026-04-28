import { AadHttpClient } from "@microsoft/sp-http";
import type { WebPartContext } from "@microsoft/sp-webpart-base";

export type ProcedureIngestResult = {
	procedureId: number | null;
	documentURL: string;
	jsonURL: string;
	pageCount: number;
	title: string;
	category: string;
	filename: string;
};

async function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const dataUrl = reader.result as string;
			const comma = dataUrl.indexOf(",");
			resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
		};
		reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
		reader.readAsDataURL(file);
	});
}

export class ProcedureChecklistIngestApi {
	constructor(private readonly context: WebPartContext) {}

	private async post(payload: Record<string, unknown>): Promise<ProcedureIngestResult> {
		const appId = (ENV.FUNCTION_API_APP_ID || "").trim();
		if (!appId) throw new Error("ENV.FUNCTION_API_APP_ID is not set.");
		const client: AadHttpClient = await this.context.aadHttpClientFactory.getClient(
			appId,
		);
		const base = (ENV.FUNCTION_BASE_URL || "").replace(/\/$/, "");
		if (!base) throw new Error("ENV.FUNCTION_BASE_URL is not set.");

		const url = `${base}/api/LopProcedureChecklistImport`;
		const res = await client.post(url, AadHttpClient.configurations.v1, {
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
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
			throw new Error(msg || `Procedure ingest failed (${res.status})`);
		}
		return JSON.parse(text) as ProcedureIngestResult;
	}

	async ingestCreate(args: {
		file: File;
		category?: string;
		title?: string;
		purpose?: string;
		effectiveDate?: string;
	}): Promise<ProcedureIngestResult> {
		const pdfBase64 = await fileToBase64(args.file);
		return this.post({
			mode: "create",
			pdfBase64,
			filename: args.file.name,
			...(args.category ? { category: args.category } : {}),
			...(args.title ? { title: args.title } : {}),
			...(args.purpose ? { purpose: args.purpose } : {}),
			...(args.effectiveDate ? { effectiveDate: args.effectiveDate } : {}),
		});
	}

	async ingestReimport(args: {
		file: File;
		procedureId: number;
		category?: string;
	}): Promise<ProcedureIngestResult> {
		const pdfBase64 = await fileToBase64(args.file);
		return this.post({
			mode: "reimport",
			procedureId: args.procedureId,
			pdfBase64,
			filename: args.file.name,
			...(args.category ? { category: args.category } : {}),
		});
	}
}
