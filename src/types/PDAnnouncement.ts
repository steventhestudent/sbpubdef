import type { ISearchResult } from "@pnp/sp/search";

export type NewsSearchResult = ISearchResult & {
	FirstPublishedDate?: string;
	SPSiteUrl?: string;
};
export type SitePageItem = {
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
export type SearchOpts = {
	enforcePdCt?: boolean;
	department?: string; // filter value (e.g., "PD-Intranet")
	departmentMp?: string; // mapped managed property alias, e.g., "Dept"
};
export type GetOpts = {
	targetSites?: string[]; // e.g., ["/sites/Attorney"]
	department?: string;
	enforcePdCt?: boolean;
	departmentMp?: string;
};
export type CreateAnnouncementInput = {
	title: string;
	department?: string; // "PD-Intranet"
	html?: string; // contenteditable HTML (we’ll strip to text for now)
	targetSite?: string; // "/sites/Attorney" or absolute; omit for current site
};
