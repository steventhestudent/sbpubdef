import rolesDict from "./rolesDict";
import isIT from "./isIT";

export default function hasRole(
	roles: RoleKey[],
	role: RoleKey | RoleKey[],
): boolean {
	if (Array.isArray(role)) {
		return role.some((r) => {
			if (r === "IT") return isIT(roles);
			return rolesDict(roles)[r];
		});
	}
	return rolesDict(roles)[role];
}
