export interface IITDemoTile {
	id: string;
	title: string;
	blurb: string;
	href: string;
	status: "operational" | "maintenance" | "planned";
}

/** Demo service catalog tiles for IT role (SharePoint demo). */
export const IT_DEMO_BANNER =
	"Tech-Team shortcuts — VPN, identity, and end-user support (dummy data).";

export const IT_DEMO_TILES: IITDemoTile[] = [
	{
		id: "servicedesk",
		title: "ServiceNow queue (PD)",
		blurb: "Open incidents, request laptop swaps, or escalate circuit outages.",
		href: "https://csproject25.sharepoint.com/sites/Tech-Team/SitePages/Service-Desk.aspx",
		status: "operational",
	},
	{
		id: "vpn",
		title: "GlobalProtect profiles & split tunnel",
		blurb: "Current client versions for macOS / Windows — demo PDF walkthrough.",
		href: "https://csproject25.sharepoint.com/sites/Tech-Team/Documents/VPN-Guide.pdf",
		status: "operational",
	},
	{
		id: "mfa",
		title: "MFA resets & hardware tokens",
		blurb: "Who to page after hours; token inventory spreadsheet (sample).",
		href: "https://csproject25.sharepoint.com/sites/Tech-Team/Lists/MFA-Resets",
		status: "planned",
	},
	{
		id: "ediscovery-storage",
		title: "e-Discovery storage quotas",
		blurb: "Per-team SharePoint storage and archive policy — demo dashboard.",
		href: "https://csproject25.sharepoint.com/sites/Tech-Team/SitePages/Storage-Quotas.aspx",
		status: "maintenance",
	},
];
