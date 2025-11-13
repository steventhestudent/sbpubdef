import * as React from "react";
import * as Utils from "@utils";
import { PD, RoleKey } from "@api/config";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import { PNPWrapper } from "@utils/PNPWrapper";

type RoleView = React.ComponentType<{
	userGroupNames: string[];
	pnpWrapper: PNPWrapper;
}>;
type RoleViews = Partial<Record<RoleKey, RoleView>>;

export function PDRoleBasedSelect({
	ctx,
	views,
}: {
	ctx: WebPartContext;
	views: RoleViews;
}): JSX.Element {
	const cachedGroupNames: RoleKey[] =
		JSON.parse(localStorage.getItem("userGroupNames") || '""') || [];
	const [userGroups, setUserGroups] =
		React.useState<string[]>(cachedGroupNames);

	const [role, setRole] = React.useState<RoleKey>(
		roleViewPriority(cachedGroupNames),
	);

	const pnpWrapper = new PNPWrapper(ctx, {
		siteUrls: ["/sites/PD-Intranet", "/sites/Tech-Team", "/sites/HR"],
		cache: "true",
	});

	const hasRole: (role: RoleKey) => boolean = (role: RoleKey) => {
		const matchDict: { [key: RoleKey]: boolean } = {
			Everyone: true,
			Attorney: userGroups.some((x) => x.includes("attorney")),
			LOP: userGroups.some((x) => x.includes("lop")),
			HR: userGroups.some((x) => x.includes("hr")),
			IT: userGroups.some(
				(x) => x.includes("it") || x.includes("administrator"),
			),
			PDIntranet: userGroups.some((x) => x.includes("PD-Intranet")),
		};
		matchDict.PDIntranet =
			matchDict.PDIntranet ||
			matchDict.Attorney ||
			matchDict.LOP ||
			matchDict.HR ||
			matchDict.IT;
		return matchDict[role];
	};

	const isRoleEnabledForUser: (role: RoleKey) => boolean = React.useCallback<
		(role: RoleKey) => boolean
	>(hasRole, [userGroups]);

	/* duplicate of hasRole... for some reason can't reuse hasRole in roleViewPriority (is it linked to the react component? (since it's used in <option disabled={...}>???)) */
	function _hasRole(roles: RoleKey[], role: RoleKey): boolean {
		const matchDict: { [key: RoleKey]: boolean } = {
			Everyone: true,
			Attorney: userGroups.some((x) => x.includes("attorney")),
			LOP: userGroups.some((x) => x.includes("lop")),
			HR: userGroups.some((x) => x.includes("hr")),
			IT: userGroups.some(
				(x) => x.includes("it") || x.includes("administrator"),
			),
			PDIntranet: userGroups.some((x) => x.includes("PD-Intranet")),
		};
		matchDict.PDIntranet =
			matchDict.PDIntranet ||
			matchDict.Attorney ||
			matchDict.LOP ||
			matchDict.HR ||
			matchDict.IT;
		return matchDict[role];
	}

	function roleViewPriority(roles: RoleKey[]): RoleKey {
		if (_hasRole(roles, "IT")) return "IT";
		if (_hasRole(roles, "HR")) return "HR";
		if (_hasRole(roles, "Attorney")) return "PDIntranet";
		if (_hasRole(roles, "LOP")) return "PDIntranet";
		if (_hasRole(roles, "PDIntranet")) return "PDIntranet";
		return "Everyone";
	}

	React.useEffect(() => {
		setTimeout(async () => {
			const g = await Utils.userGroupNames(ctx);
			localStorage.setItem("userGroupNames", JSON.stringify(g));
			setRole(roleViewPriority(g));
			setUserGroups(g.map((g) => g.toLowerCase()));
		});
	}, []);

	const CurrentView: RoleView | undefined = views[role] ?? views.Everyone;

	return (
		<section className="rounded-xl border border-[var(--webpart-border-color)] !bg-[var(--webpart-bg-color)] shadow-sm">
			<header className="bg-[var(--webpart-header-bg-color)] rounded-t-xl border-b border-slate-800 px-3 py-2 flex items-center justify-between select-none">
				<div className="flex items-center gap-2">
					<div className="font-medium text-gray-800">
						PDRoleBasedSelect
					</div>
				</div>
				<select
					value={role}
					onChange={(e) => setRole(e.target.value)}
					className="rounded-md border-slate-300 bg-white text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 px-2 py-1"
				>
					{(Object.keys(PD.role) as RoleKey[]).map((rk) => (
						<option
							key={rk}
							value={rk}
							disabled={!isRoleEnabledForUser(rk)}
						>
							{rk}
						</option>
					))}
				</select>
			</header>

			<div
				className="transition-[grid-template-rows] duration-300 ease-in-out overflow-hidden"
				style={{ display: "grid", gridTemplateRows: "1fr" }}
			>
				<div className="min-h-0">
					{CurrentView ? (
						<CurrentView
							userGroupNames={userGroups}
							pnpWrapper={pnpWrapper}
						/>
					) : null}
				</div>
			</div>
		</section>
	);
}
