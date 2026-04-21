import * as React from "react";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import * as Utils from "@utils";
import { PNPWrapper } from "@utils/PNPWrapper";
import RoleBasedViewProps from "@type/RoleBasedViewProps";

type RoleView = React.ComponentType<RoleBasedViewProps>;
type RoleViews = Partial<Record<RoleKey, RoleView>>;

export function PDRoleBasedSelect({
	ctx,
	views,
	showSelect,
	alwaysHideSelect,
	selectLabel = (
		<div className="relative mt-[-0.5em]">
			&lt;PDRoleBasedSelect&gt;
			<span className="absolute top-[1.23em] left-0 w-full text-center text-xs font-thin">
				(hidden by default)
			</span>
		</div>
	),
	preventRoleForcing = false,
}: {
	ctx: WebPartContext;
	views: RoleViews;
	showSelect?: boolean;
	alwaysHideSelect?: boolean;
	selectLabel?: string | JSX.Element;
	preventRoleForcing?: boolean;
}): JSX.Element {
	const [userGroups, setUserGroups] = React.useState<string[]>(
		Utils.cachedGroupNames(),
	);

	const [role, setRole] = React.useState<RoleKey>(
		Utils.roleViewPriority(Utils.cachedGroupNames()),
	);

	const pnpWrapper = new PNPWrapper(ctx, {
		siteUrls: ["/sites/PD-Intranet", "/sites/Tech-Team", "/sites/HR"],
		cache: "true",
	});

	const isRoleEnabledForUser: (roles: RoleKey[], role: RoleKey) => boolean = (
		roles: RoleKey[],
		role: RoleKey,
	) => {
		return Utils.hasRole(roles, role);
	};

	function forceRole(role: string): void {
		if (preventRoleForcing) return;
		setRole(role);
		setUserGroups([role]);
		setTimeout(() => (location.hash = "")); // wait for all other components to register hash change
	}
	React.useEffect(() => {
		setTimeout(async () => {
			if (location.hash.startsWith("#View-As-")) {
				forceRole(location.hash.substring(9));
				return;
			}
			const g = await Utils.userGroupNames(ctx);
			localStorage.setItem("userGroupNames", JSON.stringify(g));
			setRole(Utils.roleViewPriority(g));
			setUserGroups(g);
		});
		window.addEventListener("hashchange", function () {
			if (!location.hash.startsWith("#View-As-")) return;
			forceRole(location.hash.substring(9));
		});
	}, []);

	const CurrentView: RoleView | undefined = views[role] ?? views.EVERYONE;
	let shouldShowSelect = false;
	if (showSelect !== undefined) shouldShowSelect = showSelect;
	if (alwaysHideSelect !== undefined) shouldShowSelect = !alwaysHideSelect;

	return (
		<section className="!bg-[var(--webpart-bg-color)] shadow-sm">
			<header
				data-show-select={shouldShowSelect}
				className="data-[show-select=true]:multi-['flex'] hidden items-center justify-between border-b border-slate-800 bg-[#f2f2f2] px-3 py-2 select-none"
			>
				<div className="flex items-center gap-2">
					<div className="text-shadow-black">{selectLabel}</div>
				</div>
				<select
					value={role}
					onChange={(e) => setRole(e.target.value)}
					data-show-select={shouldShowSelect}
					className="data-[show-select=true]:multi-['block'] hidden rounded-md border-slate-300 bg-white px-2 py-1 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
				>
					{ENV.ROLESELECT_ORDER.split(" ").map((rk, i) => (
						<option
							key={i}
							value={rk}
							disabled={
								isRoleEnabledForUser(userGroups, rk)
									? false
									: true
							}
						>
							{Utils.ENV_ROLE_DISPLAY(rk)}
						</option>
					))}
				</select>
			</header>

			<div
				className="overflow-x-visible overflow-y-hidden transition-[grid-template-rows] duration-300 ease-in-out"
				style={{ display: "grid", gridTemplateRows: "1fr" }}
			>
				<div className="min-h-0">
					{CurrentView ? (
						<CurrentView
							userGroupNames={userGroups}
							pnpWrapper={pnpWrapper}
							sourceRole={role ?? "EVERYONE"}
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
	sourceRole,
}: RoleBasedViewProps): JSX.Element {
	return (
		<div className="p-5">
			<div>Welcome, Guest:</div>
			<div className="my-2">
				You must have some form of PDIntranet role (Attorney, IT, HR,
				etc.)
			</div>
			<ul>
				<h5 className="font-bold">Groups ({userGroupNames.length}):</h5>
				{userGroupNames.length ? (
					userGroupNames.map((name: string, i) => (
						<li className="ml-5 list-disc" key={i}>
							{name}
						</li>
					))
				) : (
					<li className="ml-5 list-disc">
						{Utils.ENV_ROLE_DISPLAY(sourceRole || "EVERYONE")}
					</li>
				)}
			</ul>
		</div>
	);
}
