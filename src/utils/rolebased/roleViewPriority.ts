import hasRole from "./hasRole";

export default function roleViewPriority(roles: RoleKey[]): RoleKey {
	const prio = [
		"IT",
		"COMPLIANCEOFFICER",
		"HR",
		"TRIALSUPERVISOR",
		"ATTORNEY",
		"CDD",
		"LOP",
		"PDINTRANET",
	];
	for (const rk of prio) if (hasRole(roles, rk)) return rk;
	return "EVERYONE";
}
