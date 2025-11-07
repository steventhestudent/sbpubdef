// api/announcements/Announcements.ts
import "@pnp/sp/content-types";
import type { IContentTypeInfo } from "@pnp/sp/content-types/types";
import "@pnp/sp/clientside-pages";
import { ClientsideText } from "@pnp/sp/clientside-pages";
import "@pnp/sp/fields";
import "@pnp/sp/items";

import { CustomContentApi } from "@api/CustomContentApi";
// import { PNPWrapper } from "@utils/PNPWrapper";
import { PD, SP } from "@api/config";
import {
	Announcement,
	CreateAnnouncementInput,
	// GetOpts,
	NewsSearchResult,
	SearchOpts,
	SitePageItem,
} from "@type/PDAnnouncement";

/*
	AnnouncementsApi
*/
export class AnnouncementsApi extends CustomContentApi {
	/*
		hub search
	*/
	async getSearch(
		limit = 12,
		opts: SearchOpts = {},
	): Promise<Announcement[] | undefined> {
		opts.contentType = PD.contentType.Announcement;
		await super.getSearch(limit, opts);
		this.and("PromotedState=2");
		return this.pnpWrapper.exec<Announcement[]>(async () => {
			const res = await this.pnpWrapper.sp.search({
				Querytext: this.kql,
				RowLimit: limit,
				SelectProperties: [
					"Title",
					"Path",
					"FirstPublishedDate",
					"Description",
					"SPSiteUrl",
					"PDDepartment",
				],
				SortList: [{ Property: "FirstPublishedDate", Direction: 1 }],
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
					PDDepartment: r.PDDepartment,
				} as Announcement;
			});
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
		await super.getRest(limitPerSite, sites, department);
		const targets = sites ?? this.pnpWrapper.siteUrls;
		const siteList = targets.length ? targets : [""];
		// map of pnpWrapper.web calls
		const calls = siteList.map(async (siteUrl) => {
			const w = this.pnpWrapper.web(siteUrl);
			this.and("PromotedState eq 2");
			const list = w.lists.getByTitle(SP.contentType.SitePages);

			// --- get the PD Announcement CT id for THIS library ---
			const cts = await list.contentTypes.select("StringId", "Name")();
			const pdCtId = cts.find(
				(ct) => ct.Name === PD.contentType.Announcement,
			)?.StringId;
			// this.and(`ContentTypeId eq '${pdCtId}'`);
			this.and(`startswith(ContentTypeId,'${pdCtId}')'`);

			const deptField = await list.fields
				.getByInternalNameOrTitle(PD.siteColumn.PDDepartment) // "PDDepartment"
				.select("InternalName")();
			const deptInternal: string = deptField.InternalName;

			console.log(`aaa`, deptInternal);
			const items = await list.items
				.filter(this.odata)

				.select(
					"Id",
					"Title",
					"FileRef",
					"PromotedState",
					"FirstPublishedDate",
					"Description",
					`PD_x0020_Department`, // safe even if column missing
				)
				.expand("FieldValuesAsText")
				.orderBy("FirstPublishedDate", false)
				.top(limitPerSite)();
			return (items as SitePageItem[]).map((i): Announcement => {
				console.log(i);
				return {
					title: i.Title ?? "(untitled)",
					url: i.FileRef ?? "#",
					published: i.FirstPublishedDate
						? new Date(i.FirstPublishedDate)
						: undefined,
					summary: (i.Description as string) ?? undefined,
					siteUrl: siteUrl || window.location.pathname,
					PDDepartment:
						(i.PD_x0020_Department as string) ?? undefined,
				};
			});
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
			.getByTitle(SP.contentType.SitePages)
			.contentTypes.select("StringId", "Name")();
		const pdCt = (cts as IContentTypeInfo[]).find(
			(ct) => ct.Name === PD.contentType.Announcement,
		);
		if (pdCt) {
			await item.update({ ContentTypeId: pdCt.StringId });
			// IMPORTANT: re-fetch the item so it picks up the new CT's fields
			const { Id } = await item.select("Id")();
			item = web.lists
				.getByTitle(SP.contentType.SitePages)
				.items.getById(Id);
		}

		// 3) set PD Department
		if (department) {
			// Resolve the list's internal name (handles PDDepartment vs PD_x0020_Department)
			const deptField = await web.lists
				.getByTitle(SP.contentType.SitePages)
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
