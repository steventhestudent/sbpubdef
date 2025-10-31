// @api/config.ts
export const PD = {
	contentType: {
		Announcement: "PD Announcement",
		Event: "PD Events",
	},
	libs: {
		SitePages: "Site Pages",
		Events: "Events",
	},
	fields: {
		// internal names:
		Department: "PDDepartment", // <-- internal name (very likely this)
		ExpireDate: "PD_x0020_ExpireDate",
		Summary: "Summary",
		PinUntil: "PD_x0020_PinUntil",
		Urgency: "PD_x0020_Urgency",
	},
	search: { departmentMp: "Dept" }, // OPTIONAL alias for mapped managed property
};
