export interface IGuestDemoLink {
	id: string;
	title: string;
	href: string;
}

/** Minimal public-facing links for guest / Everyone role (demo only). */
export const GUEST_DEMO_NOTE =
	"This site section shows only information appropriate for external visitors.";

export const GUEST_DEMO_LINKS: IGuestDemoLink[] = [
	{
		id: "office-info",
		title: "Office locations & general information",
		href: "https://csproject25.sharepoint.com/sites/PD-Intranet/SitePages/Public-Contact.aspx",
	},
	{
		id: "apply",
		title: "How to apply for a deputy public defender position",
		href: "https://csproject25.sharepoint.com/sites/PD-Intranet/SitePages/Careers.aspx",
	},
];
