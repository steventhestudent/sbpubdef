// api/announcements/Announcements.ts
import "@pnp/sp/content-types";
import type { IContentTypeInfo } from "@pnp/sp/content-types/types";
import "@pnp/sp/clientside-pages";
import { ClientsideText } from "@pnp/sp/clientside-pages";
import "@pnp/sp/fields";
import "@pnp/sp/items";

import { PNPWrapper } from "@utils/PNPWrapper";
import { PD } from "@api/config";
import {
	Announcement,
	CreateAnnouncementInput,
	GetOpts,
	NewsSearchResult,
	SearchOpts,
	SitePageItem,
} from "@type/PDAnnouncement";

export class AnnouncementsApi {
	constructor(private pnpWrapper: PNPWrapper) {}

	async getAnnouncements(
		limit = 12,
		opts?: GetOpts,
	): Promise<Announcement[] | undefined> {
		const {
			targetSites,
			department,
			enforcePdCt = true,
			departmentMp,
		} = opts || {};
		return this.pnpWrapper.chooseStrategy() === "rest"
			? this.getRest(limit, targetSites, department)
			: this.getSearch(limit, { enforcePdCt, department, departmentMp });
	}

	/*
		hub search
	*/
	async getSearch(
		limit = 12,
		opts?: SearchOpts,
	): Promise<Announcement[] | undefined> {
		const { enforcePdCt = true, department, departmentMp } = opts || {};
		const parts = [`PromotedState=2`];

		if (enforcePdCt)
			parts.push(`ContentType:"${PD.contentType.Announcement}"`);

		if (this.pnpWrapper.hubSiteId)
			parts.push(`DepartmentId:${this.pnpWrapper.hubSiteId}`);
		else if (this.pnpWrapper.siteUrls.length)
			parts.push(
				`(${this.pnpWrapper.siteUrls.map((p) => `Path:${p}*`).join(" OR ")})`,
			);

		// Department filter in KQL only if you’ve mapped a managed property
		if (department && departmentMp)
			parts.push(`${departmentMp}="${department}"`);

		const kql = parts.join(" AND ");

		return this.pnpWrapper.exec<Announcement[]>(async () => {
			const res = await this.pnpWrapper.sp.search({
				Querytext: kql,
				RowLimit: limit,
				SelectProperties: [
					"Title",
					"Path",
					"FirstPublishedDate",
					"Description",
					"SPSiteUrl",
				],
				SortList: [{ Property: "FirstPublishedDate", Direction: 1 }],
				TrimDuplicates: true,
			});
			let rows = res.PrimarySearchResults.map((raw) => {
				const r = raw as NewsSearchResult;
				return {
					title: r.Title ?? "(untitled)",
					url: r.Path ?? "#",
					published: r.FirstPublishedDate
						? new Date(r.FirstPublishedDate)
						: undefined,
					summary: r.Description,
					siteUrl: r.SPSiteUrl,
				} as Announcement;
			});

			// Optional client-side fallback filter if no managed property yet
			if (department && !departmentMp) {
				rows = rows.filter((a) =>
					(a.summary || "")
						.toLowerCase()
						.includes(department.toLowerCase()),
				);
			}
			return rows;
		});
	}

	/*
		rest
	*/
	async getRest(
		limitPerSite = 8,
		sites?: string[],
		department?: string,
	): Promise<Announcement[] | undefined> {
		const targets = sites ?? this.pnpWrapper.siteUrls;
		const siteList = targets.length ? targets : [""];
		// map of pnpWrapper.web calls
		const calls = siteList.map(async (siteUrl) => {
			const w = this.pnpWrapper.web(siteUrl);
			const filters: string[] = [`PromotedState eq 2`];
			if (department)
				filters.push(
					`PDDepartment eq '${department.replace(/'/g, "''")}'`,
				);
			const items = await w.lists
				.getByTitle(PD.libs.SitePages)
				.items.select(
					"Id",
					"Title",
					"FileRef",
					"PromotedState",
					"FirstPublishedDate",
					PD.fields.Summary,
				)
				.filter(filters.join(" and "))
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
					siteUrl: siteUrl || window.location.pathname,
				}),
			);
		});
		// send requests + flatten/sort results
		return this.pnpWrapper.exec<Announcement[]>(async () => {
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
		});
	}

	/*
		Create PD Announcement
	*/
	async create(input: CreateAnnouncementInput): Promise<{ url: string }> {
		const { title, department, html, targetSite } = input;
		const web = this.pnpWrapper.web(targetSite);

		// 1) create page shell
		const page = await web.addClientsidePage(
			`${title}.aspx`,
			title,
			"Article",
		);
		await page.save();

		// 2) set PD Announcement CT (library copy)
		let item = await page.getItem();
		const cts = await web.lists
			.getByTitle(PD.libs.SitePages)
			.contentTypes.select("StringId", "Name")();
		const pdCt = (cts as IContentTypeInfo[]).find(
			(ct) => ct.Name === PD.contentType.Announcement,
		);
		if (pdCt) {
			await item.update({ ContentTypeId: pdCt.StringId });
			// IMPORTANT: re-fetch the item so it picks up the new CT's fields
			const { Id } = await item.select("Id")();
			item = web.lists.getByTitle(PD.libs.SitePages).items.getById(Id);
		}

		// 3) set PD Department
		if (department) {
			// Resolve the list's internal name (handles PDDepartment vs PD_x0020_Department)
			const deptField = await web.lists
				.getByTitle(PD.libs.SitePages)
				.fields.getByInternalNameOrTitle("PDDepartment")
				.select("InternalName")();

			// Robust write (works right after CT switch)
			await item.validateUpdateListItem(
				[{ FieldName: deptField.InternalName, FieldValue: department }],
				true, // newDocumentUpdate = true
			);
		}

		// 4) add text-only body from html
		if (html) {
			const SUMMARY_LEN = 260;
			const div = document.createElement("div");
			div.innerHTML = html;
			div.querySelectorAll(
				"img,video,source,iframe,script,style",
			).forEach((el) => el.remove());
			const text = (div.textContent || "").replace(/\s+/g, " ").trim();
			const summary =
				text.length > SUMMARY_LEN
					? text.slice(0, SUMMARY_LEN - 1) + "…"
					: text;

			const sec = page.addSection();
			const col = sec.addColumn(12);
			const $txt = new ClientsideText(summary);
			$txt.text = summary;
			col.addControl($txt);
			await page.save(true);
		}

		// 5) promote & publish (and approve if required)
		await page.promoteToNews(); // sets PromotedState = 2
		// await page.schedulePublish(new Date()); // publish major version

		// 6) return absolute URL
		const li = await item.select("FileRef")();
		const absolute =
			new URL(web.toUrl(), window.location.origin).origin + li.FileRef;
		return { url: absolute };
	}
}
