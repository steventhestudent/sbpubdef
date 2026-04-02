import * as pbi from "powerbi-client";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import {
	IParsedItemWithUrl,
	IPowerBiLinkConfig,
} from "@webparts/urgencyPortal/components/IUrgencyPortalWebPartProps";

export type PBIEventResponseType =
	| { message?: string; error?: { message?: string } }
	| undefined;

export const powerbiService = new pbi.service.Service(
	pbi.factories.hpmFactory,
	pbi.factories.wpmpFactory,
	pbi.factories.routerFactory,
);

export async function getPowerBiToken(
	context: WebPartContext,
): Promise<string> {
	const provider = await context.aadTokenProviderFactory.getTokenProvider();
	return provider.getToken("https://analysis.windows.net/powerbi/api");
}

export async function getReportInfo(
	accessToken: string,
	reportId: string,
): Promise<{ embedUrl: string; webUrl: string }> {
	const response: Response = await fetch(
		`https://api.powerbi.com/v1.0/myorg/reports/${reportId}`,
		{
			headers: { Authorization: `Bearer ${accessToken}` },
		},
	);

	if (!response.ok) {
		const body: string = await response.text().catch((): string => "");
		throw new Error(`Failed to get report (${response.status}). ${body}`);
	}

	const json = (await response.json()) as {
		embedUrl: string;
		webUrl: string;
	};
	return { embedUrl: json.embedUrl, webUrl: json.webUrl };
}

export function normalizePageName(pageName?: string): string {
	return (pageName || "").trim();
}

export function normalizeBookmarkName(bookmarkName?: string): string {
	return (bookmarkName || "").trim().toLowerCase();
}

export function getItemKey(item: IParsedItemWithUrl): string {
	const url: string = (item.originalUrl || "").trim();
	const page: string = normalizePageName(item.pageName);
	const bookmark: string = normalizeBookmarkName(item.bookmarkName);

	const parts: string[] = [url];
	if (page) parts.push(`page:${page}`);
	if (bookmark) parts.push(`bookmark:${bookmark}`);

	return parts.join("||");
}

export function parseLink(cfg: IPowerBiLinkConfig): {
	item?: IParsedItemWithUrl;
	error?: string;
} {
	const title: string = (cfg.title || "").trim();
	const urlText: string = (cfg.url || "").trim();

	if (!title) return { error: "Missing title" };
	if (!urlText) return { error: `Missing URL for "${title}"` };
	if (cfg.kind !== "report" && cfg.kind !== "visual") {
		return { error: `Invalid kind for "${title}"` };
	}

	let url: URL;
	try {
		url = new URL(urlText);
	} catch {
		return { error: `Invalid URL for "${title}"` };
	}

	const bookmarkNameRaw: string = (cfg.bookmarkName || "").trim();
	const bookmarkName: string | undefined = bookmarkNameRaw
		? bookmarkNameRaw
		: undefined;

	const cfgPageName: string = normalizePageName(cfg.pageName);
	const pageNameFromCfg: string | undefined = cfgPageName
		? cfgPageName
		: undefined;

	const path: string = url.pathname || "";
	const isReportEmbed: boolean = path.toLowerCase() === "/reportembed";

	if (cfg.kind === "report") {
		if (isReportEmbed) {
			const reportId: string = url.searchParams.get("reportId") || "";
			if (!reportId) {
				return {
					error: `reportEmbed URL missing reportId for "${title}"`,
				};
			}

			return {
				item: {
					title,
					kind: "report",
					reportId,
					pageName: pageNameFromCfg,
					bookmarkName,
					originalUrl: urlText,
					thumbnailUrl: cfg.thumbnailUrl,
				},
			};
		}

		const parts: string[] = path.split("/").filter(Boolean);
		const idx: number = parts.indexOf("reports");
		if (idx >= 0 && parts[idx + 1]) {
			const reportId: string = parts[idx + 1];
			const pageNameFromUrl: string | undefined = parts[idx + 2]
				? parts[idx + 2]
				: undefined;

			return {
				item: {
					title,
					kind: "report",
					reportId,
					pageName: pageNameFromUrl || pageNameFromCfg,
					bookmarkName,
					originalUrl: urlText,
					thumbnailUrl: cfg.thumbnailUrl,
				},
			};
		}

		return { error: `Unsupported report URL for "${title}"` };
	}

	const parts: string[] = path.split("/").filter(Boolean);
	const idx: number = parts.indexOf("reports");
	if (idx < 0 || !parts[idx + 1] || !parts[idx + 2]) {
		return {
			error: `Visual URL must be /reports/{reportId}/{pageName} for "${title}"`,
		};
	}

	const reportId: string = parts[idx + 1];
	const pageName: string = parts[idx + 2];
	const visualName: string = url.searchParams.get("visual") || "";
	if (!visualName) {
		return { error: `Visual URL missing visual=... for "${title}"` };
	}

	return {
		item: {
			title,
			kind: "visual",
			reportId,
			pageName,
			visualName,
			bookmarkName,
			originalUrl: urlText,
			thumbnailUrl: cfg.thumbnailUrl,
		},
	};
}
