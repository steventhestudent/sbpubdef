// @utils/PNPWrapper.ts
import { WebPartContext } from "@microsoft/sp-webpart-base";
import { spfi, SPFI } from "@pnp/sp";
import { SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/clientside-pages";
import "@pnp/sp/search";
import { Web } from "@pnp/sp/webs";
import { Logger, LogLevel } from "@pnp/logging";
import { Caching } from "@pnp/queryable";

import type { ISearchResult } from "@pnp/sp/search";

// Search results can include extra selected properties that ISearchResult doesn't declare.
// Extend it for the props you select.
type NewsSearchResult = ISearchResult & {
	FirstPublishedDate?: string; // comes back as ISO string
	SPSiteUrl?: string;
};

type SitePageItem = {
	Title?: string;
	FileRef?: string;
	FirstPublishedDate?: string; // ISO
} & Record<string, unknown>; // lets you do i[FIELDS.SUMMARY], etc.

export type Announcement = {
	title: string;
	url: string;
	published?: Date;
	summary?: string;
	expireDate?: Date; // use undefined when missing (no `null`)
	siteUrl?: string;
};

type WrapperOptions = {
	pdAnnouncementCtName?: string; // e.g. "PD Announcement"
	sitePagesLibraryTitle?: string; // default "Site Pages"
	// Multi-site rollup options:
	hubSiteId?: string; // if you want hub-scoped Search
	siteUrls?: string[]; // explicit list of sites for REST fan-out
	useSearchByDefault?: boolean; // default true
	cache?: boolean; // session cache
};

// INTERNAL FIELD NAMES (adjust to your tenant)
const FIELDS = {
	EXPIRE_DATE: "PD_x0020_ExpireDate", // internal name of PD ExpireDate
	SUMMARY: "Summary", // modern page summary/description
};

export class PNPWrapper {
	private LOG_SOURCE = "PNPWrapper";
	private spRoot: SPFI;
	private opts: Required<WrapperOptions>;

	constructor(ctx: WebPartContext, opts?: WrapperOptions) {
		const base = spfi().using(SPFx(ctx));
		this.spRoot =
			(opts?.cache ?? true)
				? base.using(Caching({ store: "session" }))
				: base;

		this.opts = {
			pdAnnouncementCtName:
				opts?.pdAnnouncementCtName ?? "PD Announcement",
			sitePagesLibraryTitle: opts?.sitePagesLibraryTitle ?? "Site Pages",
			hubSiteId: opts?.hubSiteId ?? "",
			siteUrls: opts?.siteUrls ?? [],
			useSearchByDefault: opts?.useSearchByDefault ?? true,
			cache: opts?.cache ?? true,
		};

		Logger.activeLogLevel = LogLevel.Info;
	}

	/** Centralized error wrapper */
	private async exec<T>(
		fn: () => Promise<T>,
		fallback: T,
		label: string,
	): Promise<T> {
		try {
			return await fn();
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : JSON.stringify(err);
			console.error("PNPWrapper:", msg);
			Logger.write(
				`${this.LOG_SOURCE} (${label}) - ${msg}`,
				LogLevel.Error,
			);
			return fallback;
		}
	}

	/** Resolve a Web for current site or target site */
	private web(url?: string): ReturnType<typeof Web> {
		// IWeb
		if (!url) return this.spRoot.web;
		const full = url.startsWith("http")
			? url
			: `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
		return Web([this.spRoot.web, full]);
	}

	// ---------- ANNOUNCEMENTS ----------

	/** Hub-wide (or tenant-wide) via Search — best for rollups */
	async getAnnouncementsSearch(limit = 12): Promise<Announcement[]> {
		const ct = this.opts.pdAnnouncementCtName;
		const hub = this.opts.hubSiteId;

		const kqlParts = [`PromotedState=2`, `ContentType:"${ct}"`];
		if (hub) kqlParts.push(`DepartmentId:${hub}`);
		const kql = kqlParts.join(" AND ");

		return this.exec<Announcement[]>(
			async () => {
				const res = await this.spRoot.search({
					Querytext: kql,
					RowLimit: limit,
					SelectProperties: [
						"Title",
						"Path",
						"FirstPublishedDate",
						"Description",
						"SPSiteUrl",
					],
					SortList: [
						{ Property: "FirstPublishedDate", Direction: 1 },
					],
					TrimDuplicates: true,
				});

				return res.PrimarySearchResults.map((raw) => {
					const r = raw as NewsSearchResult;

					const title = r.Title ?? "(untitled)";
					const url = r.Path ?? "#";

					// Some tenants return selected props only via indexer access:
					// const publishedIso = (r as unknown as Record<string, string>)["FirstPublishedDate"] ?? r.FirstPublishedDate;
					const publishedIso = r.FirstPublishedDate;

					return {
						title,
						url,
						published: publishedIso
							? new Date(publishedIso)
							: undefined,
						summary: r.Description,
						siteUrl: r.SPSiteUrl,
						expireDate: undefined, // add once you map to a RefinableDate managed property
					};
				});
			},
			[],
			"getAnnouncementsSearch",
		);
	}

	/** Single-site or multi-site via REST fan-out — instant, no crawl delay */
	async getAnnouncementsRest(
		limitPerSite = 8,
		sites?: string[],
	): Promise<Announcement[]> {
		const siteUrls = sites ?? this.opts.siteUrls;
		const targets = siteUrls.length ? siteUrls : [""]; // "" = current site

		const calls = targets.map(async (siteUrl) => {
			const w = this.web(siteUrl);
			const items = await w.lists
				.getByTitle(this.opts.sitePagesLibraryTitle)
				.items.select(
					"Id",
					"Title",
					"FileRef",
					"PromotedState",
					"FirstPublishedDate",
					FIELDS.SUMMARY,
					FIELDS.EXPIRE_DATE,
				)
				.filter("PromotedState eq 2")
				.orderBy("FirstPublishedDate", false)
				.top(limitPerSite)();

			// Map REST items -> Announcement[]
			return (items as SitePageItem[]).map(
				(i): Announcement => ({
					title: i.Title ?? "(untitled)",
					url: i.FileRef ?? "#",
					published: i.FirstPublishedDate
						? new Date(i.FirstPublishedDate)
						: undefined,
					summary: (i[FIELDS.SUMMARY] as string) ?? undefined,
					expireDate: i[FIELDS.EXPIRE_DATE]
						? new Date(i[FIELDS.EXPIRE_DATE] as string)
						: undefined,
					siteUrl: siteUrl
						? this.normalizeSiteUrl(siteUrl)
						: window.location.pathname,
				}),
			);
		});

		return this.exec<Announcement[]>(
			async () => {
				const settled = await Promise.allSettled(calls);
				const flat: Announcement[] = [];
				for (const r of settled)
					if (r.status === "fulfilled") flat.push(...r.value);

				// de-dupe & sort
				const map = new Map<string, Announcement>();
				for (const a of flat) if (!map.has(a.url)) map.set(a.url, a);
				return Array.from(map.values()).sort(
					(a, b) =>
						(b.published?.getTime() ?? 0) -
						(a.published?.getTime() ?? 0),
				);
			},
			[],
			"getAnnouncementsRest",
		);
	}

	/** Convenience that chooses Search (hub-wide) or REST depending on config */
	async getAnnouncements(limit = 12): Promise<Announcement[]> {
		if (this.opts.useSearchByDefault || this.opts.hubSiteId) {
			const r = await this.getAnnouncementsSearch(limit);
			if (r.length) return r;
			return this.getAnnouncementsRest(limit, [""]);
		}
		return this.getAnnouncementsRest(limit, this.opts.siteUrls);
	}

	// ---------- HELPERS ----------

	private normalizeSiteUrl(url: string): string {
		if (url.startsWith("http")) return new URL(url).pathname;
		return url.startsWith("/") ? url : `/${url}`;
	}
}
