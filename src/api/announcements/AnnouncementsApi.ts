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
import { IList } from "@pnp/sp/lists";

export class AnnouncementsApi extends CustomContentApi<
	PDAnnouncement,
	CreateAnnouncementInput
> {
	private async resolveEntityNames(
		list: IList,
		displayOrInternalNames: string[],
	): Promise<Record<string, string | undefined>> {
		const resolved: Record<string, string | undefined> = {};
		for (const name of displayOrInternalNames) {
			try {
				const fld = await list.fields
					.getByInternalNameOrTitle(name)
					.select("InternalName", "EntityPropertyName")();
				resolved[name] = fld.EntityPropertyName || fld.InternalName;
			} catch {
				resolved[name] = undefined;
			}
		}
		return resolved;
	}

	/** HUB / multi-site (Search) */
	protected async getSearch(
		limit = 12,
		opts?: AnnGetOpts,
	): Promise<PDAnnouncement[]> {
		this.preprocess({
			...(opts ?? {}),
			contentType: PD.contentType.Announcement,
		});
		this.and("PromotedState=2");
		const selectProps = [
			"Title",
			"Path",
			"FirstPublishedDate",
			"Description", // summary
			"SPSiteUrl",
			"Author", // author display name
			"PictureThumbnailURL",
			"PDDepartment",
		];

		const res = await this.pnpWrapper.sp.search({
			Querytext: this.kql,
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
				author: r.Author, // simple string from Search
				thumbnailUrl: r.PictureThumbnailURL, // modern news thumb
				PDDepartment:
					r.PDDepartment || r.PD_x0020_Department || "Everyone", // e.g., "Dept"
			} as PDAnnouncement;
		});
	}

	protected async getRest(
		limitPerSite = 12,
		opts?: AnnGetOpts,
	): Promise<PDAnnouncement[]> {
		this.preprocess(opts);
		const targets = this._sites.length ? this._sites : [""];

		const calls = targets.map(async (siteUrl) => {
			const w = this.pnpWrapper.web(siteUrl);
			const list = w.lists.getByTitle(SP.contentType.SitePages);

			// 1) PD Announcement CT on this library
			const cts = await list.contentTypes.select("StringId", "Name")();
			const pdCt = (cts as IContentTypeInfo[]).find(
				(ct) => ct.Name === PD.contentType.Announcement,
			);
			if (!pdCt) return [] as PDAnnouncement[];
			const pdCtId = pdCt.StringId;

			// 2) Resolve key optional fields on THIS library
			const want = await this.resolveEntityNames(list, [
				"PDDepartment", // your custom choice/taxonomy
				"Description", // Site Pages “Description” field
				"BannerImageUrl", // Modern page image column
				"ExpireDate",
				"ExpirationDate",
				"PDExpireDate", // try a few candidates
			]);

			// Which expiry name did we find?
			const expireProp =
				want.ExpireDate || want.ExpirationDate || want.PDExpireDate;

			const deptProp = want.PDDepartment; // may be undefined if not on this library

			// 3) Filters
			const filters: string[] = [
				"PromotedState eq 2",
				`startswith(ContentTypeId,'${pdCtId}')`,
			];
			if (this.department && deptProp) {
				filters.push(
					`${deptProp} eq '${this.department.replace(/'/g, "''")}'`,
				);
			}

			// 4) Select/Expand
			const select = [
				"Id",
				"Title",
				"FileRef",
				"FirstPublishedDate",
				"Author/Title",
				"Author/EMail",
				"Author/Id",
			];
			if (want.Description) select.push(want.Description);
			if (want.BannerImageUrl) select.push(want.BannerImageUrl);
			if (deptProp) select.push(deptProp);
			if (expireProp) select.push(expireProp);

			const rows = await list.items
				.select(...select)
				.expand("Author")
				.filter(filters.join(" and "))
				.orderBy("FirstPublishedDate", false)
				.top(limitPerSite)();

			return (rows as SitePageItem[]).map((i: any): PDAnnouncement => {
				const summary = want.Description
					? i[want.Description]
					: undefined;

				// BannerImageUrl can be string or JSON (modern Image column). Handle both.
				let thumb: string | undefined;
				const banner = want.BannerImageUrl
					? i[want.BannerImageUrl]
					: undefined;
				if (banner) {
					if (typeof banner === "string") thumb = banner;
					else if (banner?.Url) thumb = banner.Url;
				}

				const expRaw = expireProp ? i[expireProp] : undefined;

				return {
					title: i.Title ?? "(untitled)",
					url: i.FileRef ?? "#",
					published: i.FirstPublishedDate
						? new Date(i.FirstPublishedDate)
						: undefined,
					summary: summary,
					thumbnailUrl: thumb,
					author: i.Author?.Title,
					PDDepartment: deptProp ? i[deptProp] : undefined,
					expireDate: expRaw ? new Date(expRaw) : undefined,
					siteUrl: siteUrl || window.location.pathname,
				};
			});
		});

		const settled = await Promise.allSettled(calls);
		const flat: PDAnnouncement[] = [];
		for (const r of settled)
			if (r.status === "fulfilled") flat.push(...r.value);

		// de-dupe by url and sort newest
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
