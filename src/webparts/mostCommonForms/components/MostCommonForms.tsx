import * as React from "react";
import type { IMostCommonFormsProps } from "./IMostCommonFormsProps";
import { Collapsible } from "@components/Collapsible";

export default class MostCommonForms extends React.Component<IMostCommonFormsProps> {
	public render(): React.ReactElement<IMostCommonFormsProps> {
		const forms = [
			{ label: "Time Off Request", href: "#" },
			{ label: "Mileage Reimbursement", href: "#" },
			{ label: "County Employee Handbook", href: "#" },
		];

		return (
			<Collapsible
				instanceId={this.props.instanceId}
				title="Most Common Forms"
			>
				<div className="p-4">
					<div className="grid gap-3 sm:grid-cols-2">
						{forms.map((f, i) => (
							<a
								key={i}
								href={f.href}
								className="group rounded-lg border border-slate-200 p-4 hover:border-blue-300 hover:bg-blue-50"
							>
								<p className="text-sm font-medium text-slate-800 group-hover:text-blue-800">
									{f.label}
								</p>
								<p className="text-xs text-slate-500">
									Opens form
								</p>
							</a>
						))}
					</div>
				</div>
			</Collapsible>
		);
	}
}
