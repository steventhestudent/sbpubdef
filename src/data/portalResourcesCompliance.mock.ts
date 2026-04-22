export interface IComplianceDemoResource {
	id: string;
	title: string;
	summary: string;
	href: string;
	tag: string;
}

/** Demo catalog for Compliance Officer portal resources (SharePoint demo). */
export const COMPLIANCE_DEMO_HEADLINE =
	"Oversight, policy, and audit readiness — sample links for demo only.";

export const COMPLIANCE_DEMO_RESOURCES: IComplianceDemoResource[] = [
	{
		id: "conflict-log",
		title: "Conflict screening log (template)",
		summary:
			"Rolling 90-day register of screened matters and waivers — placeholder workbook.",
		href: "https://csproject25.sharepoint.com/sites/PD-Intranet/Compliance/ConflictLog.xlsx",
		tag: "Records",
	},
	{
		id: "mcle-tracker",
		title: "MCLE / training attestation queue",
		summary:
			"Demo queue of attorneys due for ethics or specialty credits this quarter.",
		href: "https://csproject25.sharepoint.com/sites/PD-Intranet/Compliance/MCLE-Queue",
		tag: "Training",
	},
	{
		id: "discovery-policy",
		title: "Discovery retention policy (v3 draft)",
		summary:
			"Summary retention periods for body-worn video, lab reports, and juvenile seals.",
		href: "https://csproject25.sharepoint.com/sites/PD-Intranet/Compliance/Discovery-Retention",
		tag: "Policy",
	},
	{
		id: "audit-pack",
		title: "County audit response packet — Q2",
		summary:
			"Checklist of exhibits already staged for the upcoming fiscal audit (demo).",
		href: "https://csproject25.sharepoint.com/sites/PD-Intranet/Compliance/Audit-Q2",
		tag: "Audit",
	},
];
