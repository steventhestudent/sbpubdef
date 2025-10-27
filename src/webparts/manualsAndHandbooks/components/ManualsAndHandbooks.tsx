import * as React from "react";
import type { IManualsAndHandbooksProps } from "./IManualsAndHandbooksProps";

export default class ManualsAndHandbooks extends React.Component<IManualsAndHandbooksProps> {
	public render(): React.ReactElement<IManualsAndHandbooksProps> {
		return (
			<section className="rounded-xl border border-slate-200 bg-white shadow-sm">
				<header className="border-b border-slate-200 px-4 py-3">
					<h4 className="text-base font-semibold text-slate-800">
						Manuals &amp; Handbooks
					</h4>
				</header>
				<ul className="divide-y divide-slate-200">
					{[
						{ name: "County Employee Handbook (PDF)", href: "#" },
						{
							name: "Public Defender Onboarding Guide (PDF)",
							href: "#",
						},
						{ name: "Investigator Field Manual (PDF)", href: "#" },
					].map((d, i) => (
						<li key={i} className="px-4 py-3 hover:bg-slate-50">
							<a
								href={d.href}
								className="flex items-center justify-between"
							>
								<span className="text-sm text-slate-800">
									{d.name}
								</span>
								<span className="text-xs text-slate-500">
									Open
								</span>
							</a>
						</li>
					))}
				</ul>
			</section>
		);
	}
}
