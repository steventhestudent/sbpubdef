import * as React from "react";
import type { IMostCommonFormsProps } from "./IMostCommonFormsProps";

export default class MostCommonForms extends React.Component<IMostCommonFormsProps> {
	public render(): React.ReactElement<IMostCommonFormsProps> {
		const forms = [
			{ label: "Time Off Request", href: "#" },
			{ label: "Mileage Reimbursement", href: "#" },
			{ label: "County Employee Handbook", href: "#" },
		];

		return (
			<section className="rounded-xl border border-slate-200 bg-white shadow-sm">
				<header className="border-b border-slate-200 px-4 py-3">
					<h4 className="text-base font-semibold text-slate-800">
						Most Common Forms
					</h4>
				</header>
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
			</section>
		);
	}
}
