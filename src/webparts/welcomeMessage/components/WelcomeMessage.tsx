import * as React from "react";
import type { IWelcomeMessageProps } from "./IWelcomeMessageProps";
import { escape } from "@microsoft/sp-lodash-subset";
import * as Utils from "@utils";
import { WelcomeSearch } from "./WelcomeSearch";
import { PDRoleBasedSelect } from "@components/PDRoleBasedSelect";
import RoleBasedViewProps from "@type/RoleBasedViewProps";

// a wrapper to pass other things we want from props (userDisplayName)
function PDIntranetViewWrapper(
	userDisplayName: string,
): ({
	userGroupNames,
	pnpWrapper,
	sourceRole,
}: RoleBasedViewProps) => JSX.Element {
	return function PDIntranetView({
		userGroupNames,
		pnpWrapper,
		sourceRole,
	}: RoleBasedViewProps): JSX.Element {
		return (
			<section>
				<div className="rounded-xl border border-[var(--webpart-border-color)] bg-[#f9f9f9] p-6 shadow-sm">
					<h2 className="xs:text-sm text-center text-xs font-semibold text-slate-800 md:text-lg lg:text-xl">
						Welcome to the Public Defender Resource Center,&nbsp;
						<span className="group relative">
							<span className="cursor-pointer text-nowrap underline">
								{escape(userDisplayName)}
							</span>
							<span className="absolute right-[-0.4em] bottom-[-0.44em] text-sm text-gray-500">
								⌄
							</span>
							<div className="invisible absolute top-[2.05em] left-[calc(50%-7.666em)] ml-[1em] box-border max-h-[50px] w-[14em] overflow-hidden rounded-b border-1 border-[#b6b6b6] bg-slate-200 text-left text-xs opacity-0 transition-opacity duration-333 ease-in-out group-hover:visible group-hover:opacity-100">
								<div
									className="absolute relative float-left h-[48px] w-[48px] cursor-pointer border-1 border-t-0 border-l-0 border-[#b6b6b6] bg-slate-300 text-center"
									title="User Avatar"
								>
									<div className="absolute top-[50%] left-[50%] mt-[-0.6333em] ml-[-0.4em] opacity-50">
										⧅
									</div>
								</div>
								<ol
									title="Entra ID Security Groups (Group Memberships):"
									className="scrollbar-thin absolute left-[48px] max-h-full w-[calc(100%-48px)] overflow-auto p-0.5"
								>
									Groups ({userGroupNames.length}):
									{Utils.isIT(userGroupNames) ? (
										<span
											title="View Page As"
											className="absolute top-[-0.2em] right-[0em] cursor-pointer text-xl text-gray-500 hover:text-black"
											onClick={() => {
												const res = parseInt(
													prompt(
														`View Page As:\n${ENV.ROLESELECT_ORDER.split(
															" ",
														)
															.map(
																(rk, i) =>
																	`\t${i + 1}. ${(ENV as unknown as { [key: string]: string })["ROLE_" + rk]}`,
															)
															.join("\n")}`,
													) || "",
												);
												if (isNaN(res)) return;
												if (
													res === 0 ||
													res >
														ENV.ROLESELECT_ORDER.split(
															" ",
														).length
												)
													return;
												location.hash = `View-As-${
													(
														ENV as unknown as {
															[
																key: string
															]: string;
														}
													)[
														"ROLE_" +
															ENV.ROLESELECT_ORDER.split(
																" ",
															)[res - 1]
													]
												}`;
											}}
										>
											⏿
										</span>
									) : null}
									{userGroupNames.map((userGroupName) => (
										<li
											className="ml-3 list-decimal"
											key={userGroupName}
										>
											{userGroupName}
										</li>
									))}
								</ol>
								<div
									className="absolute right-0 bottom-0 cursor-pointer text-right text-xl opacity-75 hover:opacity-100"
									title="User Settings"
								>
									⚙️
								</div>
							</div>
						</span>
					</h2>
					<p className="mt-1 text-center text-sm text-slate-600">
						Find forms, manuals, events, and more.
					</p>
					<div className="mt-4 mb-1">
						<WelcomeSearch />
					</div>
				</div>
			</section>
		);
	};
}

export function WelcomeMessage(props: IWelcomeMessageProps): JSX.Element {
	return (
		<PDRoleBasedSelect
			alwaysHideSelect={true}
			ctx={props.context}
			preventRoleForcing={true}
			views={{
				Everyone: PDIntranetViewWrapper(props.userDisplayName),
				PDIntranet: PDIntranetViewWrapper(props.userDisplayName),
				Attorney: PDIntranetViewWrapper(props.userDisplayName),
				CDD: PDIntranetViewWrapper(props.userDisplayName),
				LOP: PDIntranetViewWrapper(props.userDisplayName),
				HR: PDIntranetViewWrapper(props.userDisplayName),
				ComplianceOfficer: PDIntranetViewWrapper(props.userDisplayName),
				IT: PDIntranetViewWrapper(props.userDisplayName),
				TrialSupervisor: PDIntranetViewWrapper(props.userDisplayName),
			}}
		/>
	);
}
