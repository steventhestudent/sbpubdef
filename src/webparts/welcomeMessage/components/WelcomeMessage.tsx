import * as React from "react";
import type { IWelcomeMessageProps } from "./IWelcomeMessageProps";
import { escape } from "@microsoft/sp-lodash-subset";
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
				<div className="rounded-xl border border-[var(--webpart-border-color)] p-6 shadow-sm bg-[#f9f9f9]">
					<h2 className="text-center text-xl font-semibold text-slate-800">
						Welcome to the Public Defender Resource Center,&nbsp;
						<span className="relative group">
							<span className="underline cursor-pointer text-nowrap">
								{escape(userDisplayName)}
							</span>
							<span className="absolute bottom-[-0.44em] right-[-0.4em] text-gray-500 text-sm">
								⌄
							</span>
							<div
								className="w-[14em] border-1 border-[#b6b6b6] rounded-b box-border absolute left-[calc(50%-7.666em)] top-[2em] bg-slate-200 text-xs overflow-hidden max-h-[50px] ml-[1em] text-left opacity-0
							invisible transition-opacity duration-333 ease-in-out
							group-hover:visible group-hover:opacity-100"
							>
								<div
									className="cursor-pointer absolute float-left w-[48px] h-[48px] bg-slate-300 border-1 border-l-0 border-t-0 border-[#b6b6b6] text-center relative"
									title="User Avatar"
								>
									<div className="opacity-50 absolute top-[50%] left-[50%] ml-[-0.6333em] mt-[-0.6333em]">
										❌
									</div>
								</div>
								<ol
									title="Entra ID Security Groups (Group Memberships):"
									className="p-0.5 absolute left-[48px] w-[calc(100%-48px)] overflow-auto max-h-full scrollbar-thin"
								>
									Groups ({userGroupNames.length}):
									{userGroupNames.map((userGroupName) => (
										<li
											className="list-decimal ml-3"
											key={userGroupName}
										>
											{userGroupName}
										</li>
									))}
								</ol>
								<div
									className="absolute bottom-0 right-0 cursor-pointer text-xl opacity-75 hover:opacity-100 text-right"
									title="User Settings"
								>
									⚙️
								</div>
							</div>
						</span>
					</h2>
					<p className="text-center mt-1 text-sm text-slate-600">
						Find forms, manuals, events, and more.
					</p>
					<div className="mt-4">
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
			views={{
				Everyone: PDIntranetViewWrapper(props.userDisplayName),
				PDIntranet: PDIntranetViewWrapper(props.userDisplayName),
				Attorney: PDIntranetViewWrapper(props.userDisplayName),
				LOP: PDIntranetViewWrapper(props.userDisplayName),
				HR: PDIntranetViewWrapper(props.userDisplayName),
				IT: PDIntranetViewWrapper(props.userDisplayName),
				CDD: PDIntranetViewWrapper(props.userDisplayName),
				TrialSupervisor: PDIntranetViewWrapper(props.userDisplayName),
			}}
		/>
	);
}
