import * as React from "react";
import * as Utils from "@utils";
import { PD } from "@api/config";
import { WebPartContext } from "@microsoft/sp-webpart-base";

type RoleKey = string;
type RoleView<TItem> = React.ComponentType<{
	items: TItem[];
	userGroupNames: string[];
}>;
type RoleViews<TItem> = Partial<Record<RoleKey, RoleView<TItem>>>;

export function PDRoleBasedSelect<TItem>({
	ctx,
	items,
	views,
}: {
	ctx: WebPartContext;
	items: TItem[];
	views: RoleViews<TItem>;
}): JSX.Element {
	const [role, setRole] = React.useState<RoleKey>(PD.role.Everyone);
	const [userGroups, setUserGroups] = React.useState<string[]>([]);

	React.useEffect(() => {
		setTimeout(async () => {
			const groups = await Utils.userGroupNames(ctx);
			setUserGroups(groups.map((g) => g.toLowerCase()));
		});
	}, []);

	const isRoleEnabledForUser = React.useCallback(
		(rk: RoleKey) => {
			switch (rk) {
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

	const CurrentView: RoleView<TItem> | undefined =
		views[role] ?? views.Everyone;

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
							items={items}
							userGroupNames={userGroups}
						/>
					) : null}
				</div>
			</div>
		</section>
	);
}
