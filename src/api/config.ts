// @api/config.ts
export type RoleKey = string;

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
		PDAssignment: "Assignments",
		StaffDirectory: "StaffDirectory",
		ProcedureChecklist: "LOPProcedureChecklist",
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
		AssignedAttorneyTeam: "AssignedAttorney_x002f_Team",
	},
	// mapped properties (mp) //todo: create mp's?
	department: {
		everyone: "Everyone",
		PDIntranet: "PD-Intranet",
		attorney: "Attorney",
		cdd: "CDD",
		lop: "LOP",
		trialsupervisor: "Trial-Supervisor",
		hr: "HR",
		it: "IT",
	},
	/* PDRoleBasedSelect.tsx */
	role: {
		Everyone: "Everyone", // guest/invitation fallback group // i.e.: guest only sees things associated w/ 'Everyone'
		PDIntranet: "PD-Intranet", // umbrella group (Attorney, CDD, LOP, TrialSupervisor, HR, IT) ... so all org. departments
		Attorney: "Attorney",
		CDD: "CDD",
		LOP: "LOP",
		TrialSupervisor: "TrialSupervisor",
		HR: "HR",
		IT: "IT",
	},
};
