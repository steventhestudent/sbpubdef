// api/announcements/Announcements.ts
import type { ISearchResult } from "@pnp/sp/search";
import { PNPWrapper } from "@utils/PNPWrapper";
import { PD } from "@api/config";

type NewsSearchResult = ISearchResult & {
	FirstPublishedDate?: string;
	SPSiteUrl?: string;
};

type SitePageItem = {
	Title?: string;
	FileRef?: string;
	FirstPublishedDate?: string;
} & Record<string, unknown>;

export type Announcement = {
	title: string;
	url: string;
	published?: Date;
	summary?: string;
	expireDate?: Date;
	siteUrl?: string;
};

export class AnnouncementsApi {
	constructor(private pnpWrapper: PNPWrapper) {}

	async getSearch(limit = 12): Promise<Announcement[]> {
		// Keyword Query Language (KQL)
		const kql = [
			`PromotedState=2`,
			`ContentType:"${PD.contentType.Announcement}"`,
			this.pnpWrapper.hubSiteId
				? `DepartmentId:${this.pnpWrapper.hubSiteId}`
				: undefined,
		]
			.filter(Boolean)
			.join(" AND ");

		return this.pnpWrapper.exec<Announcement[]>(
			async () => {
				const res = await this.pnpWrapper.spfi.search({
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
					return {
						title: r.Title ?? "(untitled)",
						url: r.Path ?? "#",
						published: r.FirstPublishedDate
							? new Date(r.FirstPublishedDate)
							: undefined,
						summary: r.Description,
						siteUrl: r.SPSiteUrl,
					};
				});
			},
			[],
			"AnnouncementsApi.getSearch",
		);
	}

	async getRest(limitPerSite = 8, sites?: string[]): Promise<Announcement[]> {
		const targets = sites ?? this.pnpWrapper.siteUrls;
		const siteList = targets.length ? targets : [""];

		const calls = siteList.map(async (siteUrl) => {
			const w = this.pnpWrapper.web(siteUrl);
			const items = await w.lists
				.getByTitle(PD.libs.SitePages)
				.items.select(
					"Id",
					"Title",
					"FileRef",
					"PromotedState",
					"FirstPublishedDate",
					PD.fields.Summary,
					PD.fields.ExpireDate,
				)
				.filter("PromotedState eq 2")
				.orderBy("FirstPublishedDate", false)
				.top(limitPerSite)();

			return (items as SitePageItem[]).map(
				(i): Announcement => ({
					title: i.Title ?? "(untitled)",
					url: i.FileRef ?? "#",
					published: i.FirstPublishedDate
						? new Date(i.FirstPublishedDate)
						: undefined,
					summary: (i[PD.fields.Summary] as string) ?? undefined,
					expireDate: i[PD.fields.ExpireDate]
						? new Date(i[PD.fields.ExpireDate] as string)
						: undefined,
					siteUrl: siteUrl || window.location.pathname,
				}),
			);
		});

		return this.pnpWrapper.exec<Announcement[]>(
			async () => {
				const settled = await Promise.allSettled(calls);
				const flat: Announcement[] = [];
				for (const r of settled)
					if (r.status === "fulfilled") flat.push(...r.value);
				const map = new Map<string, Announcement>();
				for (const a of flat) if (!map.has(a.url)) map.set(a.url, a);
				return Array.from(map.values()).sort(
					(a, b) =>
						(b.published?.getTime() ?? 0) -
						(a.published?.getTime() ?? 0),
				);
			},
			[],
			"AnnouncementsApi.getRest",
		);
	}

	async getAnnouncements(limit = 12): Promise<Announcement[]> {
		return this.pnpWrapper.chooseStrategy() === "rest"
			? this.getRest(limit, this.pnpWrapper.siteUrls)
			: this.getSearch(
					limit /* uses hubId inside */ /* optionally use CT filter elsewhere if you prefer a param */,
				);
	}
}
