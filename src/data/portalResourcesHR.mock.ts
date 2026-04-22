export interface IHRDemoQuickLink {
	id: string;
	label: string;
	description: string;
	href: string;
	icon: "people" | "heart" | "calendar" | "doc";
}

/** Demo HR hub links — onboarding, benefits, wellness (SharePoint demo). */
export const HR_DEMO_INTRO =
	"People operations — onboarding paths and benefits references (sample content).";

export const HR_DEMO_LINKS: IHRDemoQuickLink[] = [
	{
		id: "onboarding",
		label: "New hire onboarding (Attorneys)",
		description:
			"90-day checklist: badge, e-Defender training, and union orientation dates.",
		href: "https://csproject25.sharepoint.com/sites/HR/SitePages/Attorney-Onboarding.aspx",
		icon: "people",
	},
	{
		id: "benefits",
		label: "Medical & dental plan comparison",
		description: "Open enrollment summary charts — demo PDF for stakeholders.",
		href: "https://csproject25.sharepoint.com/sites/HR/Documents/Benefits-2026.pdf",
		icon: "heart",
	},
	{
		id: "leave",
		label: "Leave share calendar (read-only)",
		description: "Aggregated PTO blocks by division — no personal names in demo.",
		href: "https://csproject25.sharepoint.com/sites/HR/Lists/Leave-Calendar",
		icon: "calendar",
	},
	{
		id: "grievance",
		label: "Grievance intake (restricted)",
		description: "Routing matrix for union vs. non-represented staff — sample.",
		href: "https://csproject25.sharepoint.com/sites/HR/SitePages/Grievance-Routing.aspx",
		icon: "doc",
	},
];
