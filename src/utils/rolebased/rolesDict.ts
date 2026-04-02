import ENV_ROLE from "./ENV/ENV_ROLE";
import ITRoles from "./ITRoles";

export default function rolesDict(roles: RoleKey[]): {
	[key: RoleKey]: boolean;
} {
	const dict: { [key: RoleKey]: boolean } = { EVERYONE: true };
	const roleKeys = ENV.ROLESELECT_ORDER.split(" ");

	const itRoles = ITRoles();
	roles.forEach((role) => {
		roleKeys.forEach((rk) => {
			if (rk === "IT" && itRoles.includes(role)) dict.IT = true;
			else if (role === ENV_ROLE(rk)) dict[rk] = true;
		});
	});

	return dict;
}
