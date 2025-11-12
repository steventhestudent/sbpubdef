// @api/config.ts
export const SP = {
	contentType: {
		SitePages: "Site Pages",
		Events: "Events",
	},
};

export const PD = {
	contentType: {
		Announcement: "PD Announcement",
		Event: "PD Events",
		Assignment: "List",
	},
	lists: {
		PDAssignment: "AttorneyAssignments",
	},
	siteColumn: {
		PDDepartment: "PDDepartment",
		Summary: "Summary",
		// ExpireDate: "PD_x0020_ExpireDate", //_x0020_ represents space (so: PD ExpireDate)
		// PinUntil: "PD_x0020_PinUntil",
		// Urgency: "PD_x0020_Urgency",
	},
	internalSiteColumn: {
		PDDepartment: "PD_x0020_Department",
	},
	department: {
		// mapped properties (mp)
		everyone: "Everyone",
		attorney: "Attorney",
		lop: "LOP",
		hr: "HR",
		it: "IT",
	},
	/* PDRoleBasedSelect.tsx */
	role: {
		Everyone: "Everyone",
		Attorney: "Attorney",
		LOP: "LOP",
		HR: "HR",
		IT: "IT",
	},
};
