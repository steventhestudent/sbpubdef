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

export type SpClientOptions = {
	hubSiteId?: string /* https://csproject25-admin.sharepoint.com/_layouts/15/online/AdminHome.aspx#/siteManagement/view/ALL%20SITES then pick hub and copy hub id from url */;
	siteUrls?: string[];
	cache?: boolean;
};

export class PNPWrapper {
	private sp: SPFI;
	public readonly hubSiteId?: string;
	public readonly siteUrls: string[];

	constructor(ctx: WebPartContext, opts?: SpClientOptions) {
		const base = spfi().using(SPFx(ctx));
		this.sp =
			(opts?.cache ?? true)
				? base.using(Caching({ store: "session" }))
				: base;
		this.hubSiteId =
			opts?.hubSiteId || "d074d04a-ee38-4373-a580-326ed5580edb"; // default hub PD-Intranet
		this.siteUrls = opts?.siteUrls ?? [];
		Logger.activeLogLevel = LogLevel.Info;
	}

	public web(url?: string): IWeb {
		if (!url) return this.sp.web;
		const full = url.startsWith("http")
			? url
			: `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
		return Web([this.sp.web, full]);
	}

	public async exec<T>(
		fn: () => Promise<T>,
		fallback: T,
		label: string,
	): Promise<T> {
		try {
			return await fn();
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : JSON.stringify(err);
			console.error("PNPWrapper exec err:", msg);
			Logger.write(`[PNPWrapper] ${label} - ${msg}`, LogLevel.Error);
			return fallback;
		}
	}

	// expose raw primitives you’ll reuse
	public get spfi(): SPFI {
		return this.sp;
	}
}
