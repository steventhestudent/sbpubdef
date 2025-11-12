// AnnouncementsApi.ts
import "@pnp/sp/content-types";
import type { IContentTypeInfo } from "@pnp/sp/content-types/types";
import "@pnp/sp/clientside-pages";
import { ClientsideText } from "@pnp/sp/clientside-pages";
import "@pnp/sp/fields";
import "@pnp/sp/items";

import { CustomContentApi, AnnGetOpts } from "@api/CustomContentApi";
import { PD, SP } from "@api/config";
import type {
	NewsSearchResult,
	PDAnnouncement,
	SitePageItem,
	CreateAnnouncementInput,
} from "@type/PDAnnouncement";

export class AnnouncementsApi extends CustomContentApi<
	PDAnnouncement,
	CreateAnnouncementInput
> {
	/** HUB / multi-site (Search) */
	protected async getSearch(
		limit = 12,
		opts?: AnnGetOpts,
	): Promise<PDAnnouncement[]> {
		this.preprocess({
			...(opts ?? {}),
			contentType: PD.contentType.Announcement,
		});

		const parts = this.buildSearchScopeParts();
		parts.push("PromotedState=2");

		const kql = parts.join(" AND ");

		const selectProps = [
			"Title",
			"Path",
			"FirstPublishedDate",
			"Description",
			"SPSiteUrl",
		];
		// // Include your managed property alias if you’ve mapped ows_PDDepartment -> alias (e.g., Dept)
		// if (this.department || this.departmentMp || this.pnpWrapper.departmentMp) {
		// 	const mp = this.departmentMp || this.pnpWrapper.departmentMp;
		// 	if (mp) selectProps.push(mp);
		// }

		const res = await this.pnpWrapper.sp.search({
			Querytext: kql,
			RowLimit: limit,
			SelectProperties: selectProps,
			SortList: [{ Property: "FirstPublishedDate", Direction: 1 }],
			TrimDuplicates: true,
		});

		// const mp = this.departmentMp || this.pnpWrapper.departmentMp; // e.g., "Dept"
		return res.PrimarySearchResults.map((raw) => {
			const r = raw as NewsSearchResult &
				Record<string, string | undefined>;
			return {
				title: r.Title ?? "(untitled)",
				url: r.Path ?? "#",
				published: r.FirstPublishedDate
					? new Date(r.FirstPublishedDate)
					: undefined,
				summary: r.Description,
				siteUrl: r.SPSiteUrl,
				// PDDepartment:
			} as PDAnnouncement;
		});
	}

	/** Current/multi-site (REST) */
	protected async getRest(
		limitPerSite = 12,
		opts?: AnnGetOpts,
	): Promise<PDAnnouncement[]> {
		this.preprocess(opts);
		const targets = this._sites.length ? this._sites : [""];

		const calls = targets.map(async (siteUrl) => {
			const w = this.pnpWrapper.web(siteUrl);
			const list = w.lists.getByTitle(SP.contentType.SitePages);

			// 1) Get PD Announcement CT id for this library
			const cts = await list.contentTypes.select("StringId", "Name")();
			const pdCt = (cts as IContentTypeInfo[]).find(
				(ct) => ct.Name === PD.contentType.Announcement,
			);
			if (!pdCt) return [] as PDAnnouncement[];
			const pdCtId = pdCt.StringId;

			// 2) Resolve OData prop name for PDDepartment on THIS library
			let deptProp: string | undefined;
			try {
				const fld = await list.fields
					.getByInternalNameOrTitle("PDDepartment")
					.select("InternalName", "EntityPropertyName")();
				deptProp = fld.EntityPropertyName || fld.InternalName;
			} catch {
				// If PDDepartment isn’t linked to this Site Pages, treat as no department filter
				deptProp = undefined;
			}

			// 3) Build strict server-side filters
			const filters: string[] = [
				"PromotedState eq 2",
				`startswith(ContentTypeId,'${pdCtId}')`,
			];
			if (this.department && deptProp) {
				filters.push(
					`${deptProp} eq '${this.department.replace(/'/g, "''")}'`,
				);
			}

			// 4) Safe $select (includes deptProp only if we have it)
			const selects = [
				"Id",
				"Title",
				"FileRef",
				"FirstPublishedDate",
				"Description",
			];
			if (deptProp) selects.push(deptProp);

			const rows = await list.items
				.select(...selects)
				.filter(filters.join(" and "))
				.orderBy("FirstPublishedDate", false)
				.top(limitPerSite)();

			return (rows as SitePageItem[]).map(
				(i: SitePageItem): PDAnnouncement => ({
					title: i.Title ?? "(untitled)",
					url: i.FileRef ?? "#",
					published: i.FirstPublishedDate
						? new Date(i.FirstPublishedDate)
						: undefined,
					// summary: i. ?? "",
					siteUrl: siteUrl || window.location.pathname,
					PDDepartment: i.PD_x0020_Department ?? "Everyone",
				}),
			);
		});

		const settled = await Promise.allSettled(calls);
		const flat: PDAnnouncement[] = [];
		for (const r of settled)
			if (r.status === "fulfilled") flat.push(...r.value);
		// de-dupe + sort newest
		const map = new Map<string, PDAnnouncement>();
		for (const a of flat) if (!map.has(a.url)) map.set(a.url, a);
		return Array.from(map.values()).sort(
			(a, b) =>
				(b.published?.getTime() ?? 0) - (a.published?.getTime() ?? 0),
		);
	}

	/** CREATE — REST only (unchanged, just nudged to your base) */
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

		// 2) switch to PD Announcement CT
		let item = await page.getItem();
		const cts = await web.lists
			.getByTitle(SP.contentType.SitePages)
			.contentTypes.select("StringId", "Name")();
		const pdCt = (cts as IContentTypeInfo[]).find(
			(ct) => ct.Name === PD.contentType.Announcement,
		);
		if (pdCt) {
			await item.update({ ContentTypeId: pdCt.StringId });
			const { Id } = await item.select("Id")();
			item = web.lists
				.getByTitle(SP.contentType.SitePages)
				.items.getById(Id);
		}

		// 3) PDDepartment (robust write immediately after CT switch)
		if (department) {
			const deptField = await web.lists
				.getByTitle(SP.contentType.SitePages)
				.fields.getByInternalNameOrTitle("PDDepartment")
				.select("InternalName")();
			await item.validateUpdateListItem(
				[{ FieldName: deptField.InternalName, FieldValue: department }],
				true,
			);
		}

		// 4) add summary text from HTML
		if (html) {
			const div = document.createElement("div");
			div.innerHTML = html;
			div.querySelectorAll(
				"img,video,source,iframe,script,style",
			).forEach((el) => el.remove());
			const text = (div.textContent || "").replace(/\s+/g, " ").trim();
			const summary = text.length > 260 ? text.slice(0, 259) + "…" : text;

			const sec = page.addSection();
			const col = sec.addColumn(12);
			const $txt = new ClientsideText(summary);
			$txt.text = summary;
			col.addControl($txt);
			await page.save(true);
		}

		// 5) promote & publish
		await page.promoteToNews();

		// 6) return URL
		const li = await item.select("FileRef")();
		const absolute =
			new URL(web.toUrl(), window.location.origin).origin + li.FileRef;
		return { url: absolute };
	}
}
