import type { ISearchResult } from "@pnp/sp/search";

export type NewsSearchResult = ISearchResult & {
	[key: string]: string | undefined;
	FirstPublishedDate?: string;
	SPSiteUrl?: string;
	PDDepartment?: string;
	PD_x0020_Department?: string;
};
export type SitePageItem = {
	Title?: string;
	FileRef?: string;
	FirstPublishedDate?: string;
	PD_x0020_Department?: string;
	PDDepartment?: string;
} & Record<string, unknown>;

export type PDAnnouncement = {
	title: string;
	url: string;
	published?: Date;

	// NEW:
	summary?: string; // from Description or first text part
	thumbnailUrl?: string; // from PictureThumbnailURL (search) or BannerImageUrl (REST)
	author?: string; // Author display name
	expireDate?: Date; // your custom expiry field
	siteUrl?: string;
	PDDepartment?: string;
};

export type SearchOpts = {
	contentType?: string;
	department?: string; // filter value (e.g., "PD-Intranet")
	departmentMp?: string; // mapped managed property alias, e.g., "Dept"
};
export type GetOpts = {
	contentType?: string;
	targetSites?: string[]; // e.g., ["/sites/Attorney"]
	department?: string;
	departmentMp?: string;
};
export type CreateAnnouncementInput = {
	title: string;
	department?: string; // "PD-Intranet"
	html?: string; // contenteditable HTML (we’ll strip to text for now)
	targetSite?: string; // "/sites/Attorney" or absolute; omit for current site
};
