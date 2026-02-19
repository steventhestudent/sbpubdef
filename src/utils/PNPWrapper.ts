// @utils/PNPWrapper.ts
import { spfi, SPFI } from "@pnp/sp";
import { SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/clientside-pages";
import "@pnp/sp/search";
import { IWeb, Web } from "@pnp/sp/webs";
import { Logger, LogLevel } from "@pnp/logging";
import { Caching } from "@pnp/queryable";
import { WebPartContext } from "@microsoft/sp-webpart-base";

const DEFAULT_CACHE = false;
type cacheSettingType = boolean | "true"; //"true" is true... it uses cache, but then subsequent requests do not (initialCachedRequestFlag / shouldUseCache())

export type SpClientOptions = {
	hubSiteId?: string /* https://csproject25-admin.sharepoint.com/_layouts/15/online/AdminHome.aspx#/siteManagement/view/ALL%20SITES then pick hub and copy hub id from url */;
	siteUrls?: string[];
	cache?: cacheSettingType;
};

export class PNPWrapper {
	public ctx: WebPartContext;
	private _spfi: SPFI;
	private _spfi_use_cache: SPFI;
	public readonly hubSiteId?: string;
	public readonly siteUrls: string[];
	// private currentSitePath: string;
	private currentWebPath: string;
	private cacheSetting!: cacheSettingType;
	private initialCachedRequestFlag: boolean; //todo: flagDict (initialCachedRequestFlag for each unique set of query options), accessing .sp triggers this... shouldn't it be when accessing .web() or .sp.web()???

	constructor(ctx: WebPartContext, opts?: SpClientOptions) {
		this.ctx = ctx;
		this._spfi = spfi().using(SPFx(ctx));
		this._spfi_use_cache = spfi()
			.using(SPFx(ctx))
			.using(Caching({ store: "session" }));
		this.cacheSetting = opts?.cache ?? DEFAULT_CACHE;
		this.hubSiteId =
			opts?.hubSiteId || "d074d04a-ee38-4373-a580-326ed5580edb"; // default hub PD-Intranet
		this.siteUrls = opts?.siteUrls ?? [];
		if (this.siteUrls.length === 0)
			this.siteUrls.push("/sites/PD-Intranet");
		Logger.activeLogLevel = LogLevel.Info;

		// const site = ctx.pageContext.site.serverRelativeUrl || "/";
		const web = ctx.pageContext.web.serverRelativeUrl || "/";
		// this.currentSitePath = this.normalizePath(site);
		this.currentWebPath = this.normalizePath(web);
	}

	private normalizePath(input: string): string {
		// turn "https://host/sites/Attorney" or "/sites/Attorney/" into "/sites/Attorney" (lowercased)
		const p = input.startsWith("http") ? new URL(input).pathname : input;
		return (p.endsWith("/") ? p.slice(0, -1) : p).toLowerCase();
	}

	private toAbsolutePathLike(input: string): string {
		// allow "/sites/Attorney" or "https://host/sites/Attorney"
		return this.normalizePath(
			input.startsWith("http")
				? input
				: new URL(input, window.location.origin).toString(),
		);
	}

	public chooseStrategy(targetSites?: string[]): "rest" | "search" {
		const sites = targetSites || this.siteUrls;
		if (!sites || sites.length === 0) {
			// No targets provided => current web/site
			return "rest";
		}
		if (sites.length > 1) return "search";

		const target = this.toAbsolutePathLike(sites[0]);

		// SAFEST: only treat as "current web" if it exactly matches the current web path.
		// Example: current "/sites/Attorney", target "/sites/Attorney" => REST
		// If your "this.siteUrls" are site-collection roots and you’re in a subweb, you CAN
		// relax this to startsWith, but exact equals is the least surprising here.
		return target === this.currentWebPath ? "rest" : "search";
	}

	public web(url?: string): IWeb {
		if (!url) return this.sp.web;
		const full = url.startsWith("http")
			? url
			: `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
		return Web([this.sp.web, full]);
	}

	public async exec<T>(fn: () => Promise<T>): Promise<T | undefined> {
		try {
			return await fn();
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : JSON.stringify(err);
			console.error("PNPWrapper exec err:", msg);
			Logger.write(`[PNPWrapper] \${label} - ${msg}`, LogLevel.Error);
			return undefined;
		}
	}

	public shouldUseCache(): boolean {
		if (this.cacheSetting === "true") return !this.initialCachedRequestFlag;
		return this.cacheSetting;
	}

	get spfi(): SPFI {
		return this._spfi;
	}
	get spfi_use_cache(): SPFI {
		return this._spfi_use_cache;
	}
	get sp(): SPFI {
		const shouldUseCache = this.shouldUseCache();
		if (!this.initialCachedRequestFlag && shouldUseCache)
			setTimeout(() => (this.initialCachedRequestFlag = true)); // don't use cache on subsequent requests (on this.pnpWrapper) (settimeout to wait for other components to finish their cached requests)
		console.log(`shoulduse cache: ${shouldUseCache}`);
		return shouldUseCache ? this.spfi_use_cache : this.spfi;
	}
}
