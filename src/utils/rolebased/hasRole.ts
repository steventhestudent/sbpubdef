import rolesDict from "./rolesDict";

export default function hasRole(roles: RoleKey[], role: RoleKey): boolean {
	return rolesDict(roles)[role];
}
