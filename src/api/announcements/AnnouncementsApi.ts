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
	// SitePageItem,
	CreateAnnouncementInput,
} from "@type/PDAnnouncement";
import type { IList } from "@pnp/sp/lists";

// ------------ Local helper types (no `any`) ------------
type SPAuthor = { Title?: string; EMail?: string; Id?: number };

type RestRowBase = {
	Title?: string;
	FileRef?: string;
	FirstPublishedDate?: string;
	Author?: SPAuthor | string; // after expand("Author"), usually object
};

// Index signature uses unknown; callers must narrow.
type RestRow = RestRowBase & { [key: string]: unknown };

// ------------ Narrowing helpers (keep TS strict) ------------
const getString = (row: RestRow, key?: string): string | undefined => {
	if (!key) return undefined;
	const v = row[key];
	return typeof v === "string" ? v : undefined;
};

const getBannerUrl = (row: RestRow, key?: string): string | undefined => {
	if (!key) return undefined;
	const v = row[key];
	if (typeof v === "string") return v;
	if (v && typeof v === "object") {
		const maybe = v as { Url?: unknown; url?: unknown };
		if (typeof maybe.Url === "string") return maybe.Url;
		if (typeof maybe.url === "string") return maybe.url;
	}
	return undefined;
};

// Works for:
//  - Choice: string
//  - Taxonomy (single): { Label?: string }
//  - Taxonomy (multi): [{ Label?: string }, ...]
const getLabelish = (row: RestRow, key?: string): string | undefined => {
	if (!key) return undefined;
	const v = row[key];

	if (typeof v === "string") return v;

	if (Array.isArray(v)) {
		const first = v[0];
		if (first && typeof first === "object" && "Label" in first) {
			const lbl = (first as { Label?: unknown }).Label;
			return typeof lbl === "string" ? lbl : undefined;
		}
		return undefined;
	}

	if (v && typeof v === "object" && "Label" in v) {
		const lbl = (v as { Label?: unknown }).Label;
		return typeof lbl === "string" ? lbl : undefined;
	}

	return undefined;
};

export class AnnouncementsApi extends CustomContentApi<
	PDAnnouncement,
	CreateAnnouncementInput
> {
	// Resolve field EntityPropertyName for the *current* Site Pages library
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
		// News-only
		this.and("PromotedState=2");

		const selectProps = [
			"Title",
			"Path",
			"FirstPublishedDate",
			"Description", // summary
			"SPSiteUrl",
			"Author", // author display name (string in search)
			"PictureThumbnailURL", // modern news thumbnail
			"PDDepartment", // if you crawled/mapped it to a managed prop with exactly this name
		];

		const res = await this.pnpWrapper.sp.search({
			Querytext: this.kql,
			RowLimit: limit,
			SelectProperties: selectProps,
			SortList: [{ Property: "FirstPublishedDate", Direction: 1 }],
			TrimDuplicates: true,
		});

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
				author: r.Author,
				thumbnailUrl: r.PictureThumbnailURL,
				PDDepartment:
					r.PDDepartment || r.PD_x0020_Department || "Everyone",
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

			// 1) Ensure PD Announcement CT exists in this library
			const cts = await list.contentTypes.select("StringId", "Name")();
			const pdCt = (cts as IContentTypeInfo[]).find(
				(ct) => ct.Name === PD.contentType.Announcement,
			);
			if (!pdCt) return [] as PDAnnouncement[];
			const pdCtId = pdCt.StringId;

			// 2) Resolve optional fields for THIS library
			const want = await this.resolveEntityNames(list, [
				"PDDepartment", // choice / taxonomy (label expected)
				"Description", // Site Pages “Description”
				"BannerImageUrl", // modern page image column
				"ExpireDate",
				"ExpirationDate",
				"PDExpireDate",
			]);

			const expireProp =
				want.ExpireDate || want.ExpirationDate || want.PDExpireDate;
			const deptProp = want.PDDepartment;

			// 3) Server-side filters
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
			const select: string[] = [
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

			// 5) Map rows -> PDAnnouncement with safe narrowing
			return (rows as unknown as RestRow[]).map((i): PDAnnouncement => {
				const summary = getString(i, want.Description);
				const thumb = getBannerUrl(i, want.BannerImageUrl);
				const expRaw = getString(i, expireProp);
				const deptVal = getLabelish(i, deptProp);

				const a = i.Author;
				const authorName = typeof a === "string" ? a : a?.Title;

				return {
					title: i.Title ?? "(untitled)",
					url: i.FileRef ?? "#",
					published: i.FirstPublishedDate
						? new Date(i.FirstPublishedDate)
						: undefined,
					summary,
					thumbnailUrl: thumb,
					author: authorName,
					PDDepartment: deptVal,
					expireDate: expRaw ? new Date(expRaw) : undefined,
					siteUrl: siteUrl || window.location.pathname,
				};
			});
		});

		const settled = await Promise.allSettled(calls);
		const flat: PDAnnouncement[] = [];
		for (const r of settled)
			if (r.status === "fulfilled") flat.push(...r.value);

		// de-dupe by URL + newest first
		const map = new Map<string, PDAnnouncement>();
		for (const a of flat) if (!map.has(a.url)) map.set(a.url, a);

		return Array.from(map.values()).sort(
			(a, b) =>
				(b.published?.getTime() ?? 0) - (a.published?.getTime() ?? 0),
		);
	}

	/** CREATE — REST only */
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
