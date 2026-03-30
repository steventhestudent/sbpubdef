import ITRoles from "./ITRoles";

export default function rolesDict(roles: RoleKey[]): {
	[key: RoleKey]: boolean;
} {
	const dict: { [key: RoleKey]: boolean } = { EVERYONE: true };
	const roleKeys = ENV.ROLESELECT_ORDER.split(" ");

	const itRoles = ITRoles();
	roles.forEach((role) => {
		roleKeys.forEach((rk) => {
			const r = (ENV as unknown as { [key: string]: string })[
				"ROLE_" + rk
			];
			if (rk === "IT" && itRoles.includes(role)) dict.IT = true;
			else if (role === r) dict[rk] = true;
		});
	});

	return dict;
}
