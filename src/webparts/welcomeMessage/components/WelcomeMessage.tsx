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
						<span className="relative group cursor-pointer underline">
							{escape(userDisplayName)}!
							<div className="absolute right-5 top-[2.3em] left-0 bg-slate-300 text-xs overflow-auto max-h-[8em] ml-[1em] text-left hidden group-hover:block">
								<ul>
									{userGroupNames.map((userGroupName) => (
										<li
											className="list-disc ml-5"
											key={userGroupName}
										>
											{userGroupName}
										</li>
									))}
								</ul>
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
