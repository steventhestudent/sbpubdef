import isIT from "./isIT";
import { ENV_ROLE } from "@utils/rolebased/ENV";

export default function isGlobalEditor(userGroupNames: string[]): boolean {
	const globalEditorRoles = ENV.GLOBAL_EDIT_ROLES.split(" ").map(($0, i) =>
		ENV_ROLE($0),
	);
	for (const r of userGroupNames)
		if (globalEditorRoles.includes(r)) return true;
	return isIT(userGroupNames) || false;
}
