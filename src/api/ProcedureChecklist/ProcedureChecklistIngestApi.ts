import { AadHttpClient } from "@microsoft/sp-http";
import type { WebPartContext } from "@microsoft/sp-webpart-base";

export type ProcedureIngestResult = {
	procedureId: number | undefined;
	documentURL: string;
	jsonURL: string;
	pageCount: number;
	title: string;
	category: string;
	filename: string;
};

export type IngestProgressPhase =
	| "reading"
	| "encoding"
	| "uploading"
	/** Request body has been sent; waiting for Azure Function (PDF parse + Graph). */
	| "server"
	| "processing"
	| "complete";

export type IngestProgressReport = {
	percent: number;
	phase: IngestProgressPhase;
};

export type IngestProgressCallback = (report: IngestProgressReport) => void;

function encodeBytesToBase64Progress(
	bytes: Uint8Array,
	onChunk: (fraction: number) => void,
): string {
	const chunkSize = 16384;
	let binary = "";
	const len = bytes.length;
	for (let i = 0; i < len; i += chunkSize) {
		const end = Math.min(i + chunkSize, len);
		const sub = bytes.subarray(i, end);
		binary += String.fromCharCode.apply(
			undefined,
			Array.from(sub) as number[],
		);
		onChunk(len ? end / len : 1);
	}
	return btoa(binary);
}

async function acquireFunctionApiToken(
	context: WebPartContext,
	appId: string,
): Promise<string> {
	const provider = await context.aadTokenProviderFactory.getTokenProvider();
	const id = appId.trim();
	const candidates = [id, `api://${id}`, `api://${id}/.default`];
	let last: unknown;
	for (const resource of candidates) {
		try {
			return await provider.getToken(resource);
		} catch (e) {
			last = e;
		}
	}
	throw last instanceof Error ? last : new Error(String(last));
}

function xhrPostJson(
	url: string,
	token: string,
	body: string,
	onUploadProgress?: (loaded: number, total: number) => void,
	onUploadFinished?: () => void,
): Promise<{ ok: boolean; status: number; text: string }> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		let finishedFired = false;
		const fireFinished = (): void => {
			if (finishedFired) return;
			finishedFired = true;
			onUploadFinished?.();
		};
		xhr.open("POST", url);
		xhr.setRequestHeader("Authorization", `Bearer ${token}`);
		xhr.setRequestHeader("Accept", "application/json");
		xhr.setRequestHeader("Content-Type", "application/json");
		xhr.upload.onprogress = (ev) => {
			if (!onUploadProgress) return;
			if (ev.lengthComputable && ev.total > 0) {
				onUploadProgress(ev.loaded, ev.total);
				if (ev.loaded >= ev.total) fireFinished();
			} else if (ev.loaded > 0) {
				onUploadProgress(ev.loaded, ev.loaded + 1);
			}
		};
		xhr.upload.onload = () => {
			fireFinished();
		};
		xhr.upload.onloadend = () => {
			fireFinished();
		};
		xhr.onreadystatechange = () => {
			// As soon as we get headers back, we know the server is processing/responding.
			// This also acts as a fallback when upload events are flaky.
			if (xhr.readyState >= 2) fireFinished();
		};
		xhr.onload = () => {
			resolve({
				ok: xhr.status >= 200 && xhr.status < 300,
				status: xhr.status,
				text: xhr.responseText ?? "",
			});
		};
		xhr.onerror = () =>
			reject(new Error("Network error while uploading the PDF."));
		xhr.onabort = () => reject(new Error("Upload was cancelled."));
		xhr.send(body);
	});
}

export class ProcedureChecklistIngestApi {
	constructor(private readonly context: WebPartContext) {}

	private emit(
		onProgress: IngestProgressCallback | undefined,
		percent: number,
		phase: IngestProgressPhase,
	): void {
		onProgress?.({
			percent: Math.max(0, Math.min(100, percent)),
			phase,
		});
	}

	private async postPayload(
		payload: Record<string, unknown>,
		onProgress?: IngestProgressCallback,
	): Promise<ProcedureIngestResult> {
		const appId = (ENV.FUNCTION_API_APP_ID || "").trim();
		if (!appId) throw new Error("ENV.FUNCTION_API_APP_ID is not set.");
		const base = (ENV.FUNCTION_BASE_URL || "").replace(/\/$/, "");
		if (!base) throw new Error("ENV.FUNCTION_BASE_URL is not set.");

		const url =
			payload && payload["_fastStart"] === true
				? `${base}/api/LopProcedureChecklistImportStart`
				: `${base}/api/LopProcedureChecklistImport`;
		const body = JSON.stringify(payload);

		const parseResult = (text: string, status: number): ProcedureIngestResult => {
			if (status < 200 || status >= 300) {
				let msg = text;
				try {
					const j = JSON.parse(text) as { error?: string };
					if (j.error) msg = j.error;
				} catch {
					// ignore
				}
				throw new Error(msg || `Procedure ingest failed (${status})`);
			}
			return JSON.parse(text) as ProcedureIngestResult;
		};

		if (onProgress) {
			this.emit(onProgress, 33, "uploading");
			let token: string;
			try {
				token = await acquireFunctionApiToken(this.context, appId);
			} catch {
				this.emit(onProgress, 40, "uploading");
				this.emit(onProgress, 86, "server");
				const client: AadHttpClient =
					await this.context.aadHttpClientFactory.getClient(appId);
				const res = await client.post(
					url,
					AadHttpClient.configurations.v1,
					{
						headers: {
							Accept: "application/json",
							"Content-Type": "application/json",
						},
						body,
					},
				);
				const text = await res.text();
				this.emit(onProgress, 97, "processing");
				const out = parseResult(text, res.status);
				this.emit(onProgress, 100, "complete");
				return out;
			}

			const uploadLo = 33;
			const uploadHi = 85;
			const res = await xhrPostJson(
				url,
				token,
				body,
				(loaded, total) => {
					const t = Math.max(1, total);
					const u = Math.min(1, loaded / t);
					this.emit(
						onProgress,
						uploadLo + u * (uploadHi - uploadLo),
						"uploading",
					);
				},
				() => {
					this.emit(onProgress, 86, "server");
				},
			);
			this.emit(onProgress, 97, "processing");
			const out = parseResult(res.text, res.status);
			this.emit(onProgress, 100, "complete");
			return out;
		}

		const client: AadHttpClient =
			await this.context.aadHttpClientFactory.getClient(appId);
		const res = await client.post(url, AadHttpClient.configurations.v1, {
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body,
		});
		const text = await res.text();
		return parseResult(text, res.status);
	}

	private async buildPayload(
		args: {
			mode: "create" | "reimport";
			file: File;
			procedureId?: number;
			category?: string;
			title?: string;
			purpose?: string;
			effectiveDate?: string;
		},
		onProgress?: IngestProgressCallback,
	): Promise<Record<string, unknown>> {
		if (onProgress) this.emit(onProgress, 2, "reading");
		const buf = await args.file.arrayBuffer();
		const bytes = new Uint8Array(buf);

		if (onProgress) this.emit(onProgress, 6, "encoding");
		const pdfBase64 = onProgress
			? encodeBytesToBase64Progress(bytes, (frac) => {
					this.emit(onProgress, 6 + frac * 26, "encoding");
				})
			: await (async () => {
					const reader = new FileReader();
					return new Promise<string>((resolve, reject) => {
						reader.onload = () => {
							const dataUrl = reader.result as string;
							const comma = dataUrl.indexOf(",");
							resolve(
								comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl,
							);
						};
						reader.onerror = () =>
							reject(
								reader.error || new Error("Failed to read file"),
							);
						reader.readAsDataURL(args.file);
					});
				})();

		if (onProgress) this.emit(onProgress, 32, "encoding");

		const base: Record<string, unknown> = {
			mode: args.mode,
			pdfBase64,
			filename: args.file.name,
		};
		if (args.mode === "reimport" && args.procedureId !== undefined) {
			base.procedureId = args.procedureId;
		}
		if (args.category) base.category = args.category;
		if (args.title) base.title = args.title;
		if (args.purpose) base.purpose = args.purpose;
		if (args.effectiveDate) base.effectiveDate = args.effectiveDate;
		return base;
	}

	async ingestCreate(args: {
		file: File;
		category?: string;
		title?: string;
		purpose?: string;
		effectiveDate?: string;
		fastStart?: boolean;
		onProgress?: IngestProgressCallback;
	}): Promise<ProcedureIngestResult> {
		const payload = await this.buildPayload(
			{
				mode: "create",
				file: args.file,
				category: args.category,
				title: args.title,
				purpose: args.purpose,
				effectiveDate: args.effectiveDate,
			},
			args.onProgress,
		);
		if (args.fastStart) (payload as Record<string, unknown>)["_fastStart"] = true;
		return this.postPayload(payload, args.onProgress);
	}

	async ingestReimport(args: {
		file: File;
		procedureId: number;
		category?: string;
		fastStart?: boolean;
		onProgress?: IngestProgressCallback;
	}): Promise<ProcedureIngestResult> {
		const payload = await this.buildPayload(
			{
				mode: "reimport",
				file: args.file,
				procedureId: args.procedureId,
				category: args.category,
			},
			args.onProgress,
		);
		if (args.fastStart) (payload as Record<string, unknown>)["_fastStart"] = true;
		return this.postPayload(payload, args.onProgress);
	}
}
