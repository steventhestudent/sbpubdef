import * as React from "react";
import * as Utils from "@utils";
import { PD } from "@api/config";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import { PNPWrapper } from "@utils/PNPWrapper";

type RoleKey = string;
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
	const [role, setRole] = React.useState<RoleKey>(PD.role.Everyone);
	const [userGroups, setUserGroups] = React.useState<string[]>([]);
	const pnpWrapper = new PNPWrapper(ctx, {
		siteUrls: ["/sites/PD-Intranet", "/sites/Tech-Team", "/sites/HR"],
		cache: "true",
	});

	React.useEffect(() => {
		setTimeout(async () => {
			const groups = await Utils.userGroupNames(ctx);
			setUserGroups(groups.map((g) => g.toLowerCase()));
		});
	}, []);

	const isRoleEnabledForUser: (rk: string) => boolean = React.useCallback<
		(rk: string) => boolean
	>(
		(rk: RoleKey) => {
			switch (rk) {
				case "PDIntranet":
					return (
						isRoleEnabledForUser("Attorney") ||
						isRoleEnabledForUser("LOP") ||
						isRoleEnabledForUser("HR") ||
						isRoleEnabledForUser("IT") ||
						userGroups.some((x) => x.includes("pd-intranet"))
					);
				case "Attorney":
					return userGroups.some((x) => x.includes("attorney"));
				case "LOP":
					return userGroups.some((x) => x.includes("lop"));
				case "HR":
					return userGroups.some((x) => x.includes("hr"));
				case "IT":
					return userGroups.some(
						(x) => x.includes("it") || x.includes("administrator"),
					);
				case "Everyone":
				default:
					return true;
			}
		},
		[userGroups],
	);

	const CurrentView: RoleView | undefined = views[role] ?? views.Everyone;

	return (
		<section className="rounded-xl border border-[var(--webpart-border-color)] !bg-[var(--webpart-bg-color)] shadow-sm">
			<header className="bg-[var(--webpart-header-bg-color)] rounded-t-xl border-b border-slate-800 px-3 py-2 flex items-center justify-between select-none">
				<div className="flex items-center gap-2">
					<div className="font-medium text-gray-800">
						PDRoleBasedSelect
					</div>
				</div>
				<select value={role} onChange={(e) => setRole(e.target.value)}>
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
