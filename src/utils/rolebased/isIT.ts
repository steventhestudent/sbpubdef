import ITRoles from "./ITRoles";

export default function isIT(userGroupNames: string[]): boolean {
	const itRoles = ITRoles();
	for (const r of userGroupNames) if (itRoles.includes(r)) return true;
	return false;
}
