import * as React from "react";
import * as Utils from "@utils";
import { PD, RoleKey } from "@api/config";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import { PNPWrapper } from "@utils/PNPWrapper";
import RoleBasedViewProps from "@type/RoleBasedViewProps";

type RoleView = React.ComponentType<RoleBasedViewProps>;
type RoleViews = Partial<Record<RoleKey, RoleView>>;

export function PDRoleBasedSelect({
	ctx,
	views,
	showSelect,
	selectLabel = (
		<div className="relative mt-[-0.5em]">
			&lt;PDRoleBasedSelect&gt;
			<span className="absolute font-thin text-xs w-full left-0 text-center top-[1.23em]">
				(hidden by default)
			</span>
		</div>
	),
}: {
	ctx: WebPartContext;
	views: RoleViews;
	showSelect?: boolean;
	selectLabel?: string | JSX.Element;
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
			TrialSupervisor: userGroups.some((x) => x.includes("supervisor")),
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
			matchDict.TrialSupervisor ||
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
			TrialSupervisor: userGroups.some((x) => x.includes("supervisor")),
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
			matchDict.TrialSupervisor ||
			matchDict.HR ||
			matchDict.IT;
		return matchDict[role];
	}

	function roleViewPriority(roles: RoleKey[]): RoleKey {
		if (_hasRole(roles, "IT")) return "IT";
		if (_hasRole(roles, "HR")) return "HR";
		if (_hasRole(roles, "Attorney")) return "Attorney";
		if (_hasRole(roles, "LOP")) return "LOP";
		if (_hasRole(roles, "TrialSupervisor")) return "TrialSupervisor";
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
	const shouldShowSelect = showSelect || role === "IT";

	return (
		<section className="border border-[var(--webpart-border-color)] !bg-[var(--webpart-bg-color)] shadow-sm">
			<header
				data-show-select={shouldShowSelect}
				className="hidden data-[show-select=true]:multi-['flex']
						bg-[#f2f2f2] border-b border-slate-800 px-3 py-2 items-center justify-between select-none"
			>
				<div className="flex items-center gap-2">
					<div className="text-shadow-black">{selectLabel}</div>
				</div>
				<select
					value={role}
					onChange={(e) => setRole(e.target.value)}
					data-show-select={shouldShowSelect}
					className="hidden data-[show-select=true]:multi-['block']
								rounded-md border-slate-300 bg-white text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 px-2 py-1"
				>
					{(Object.keys(PD.role) as RoleKey[]).map((rk) => (
						<option
							key={rk}
							value={rk}
							disabled={
								isRoleEnabledForUser(rk) == true ? false : false
							}
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
							sourceRole={role ?? "Everyone"}
						/>
					) : null}
				</div>
			</div>
		</section>
	);
}

export function BlankGuestView({
	userGroupNames,
	pnpWrapper,
}: RoleBasedViewProps): JSX.Element {
	return (
		<div className="p-5">
			<div>Welcome, Guest:</div>
			<div className="mt-2">
				You must have some form of PDIntranet role (Attorney, IT, HR,
				etc.) to have assignments.
			</div>
			<ul>
				<h5 className="font-bold">Groups:</h5>
				{userGroupNames.map((name: string, i) => (
					<li className="list-disc ml-5" key={i}>
						{name}
					</li>
				))}
				{!userGroupNames.length ? <div>N/A</div> : null}
			</ul>
		</div>
	);
}
