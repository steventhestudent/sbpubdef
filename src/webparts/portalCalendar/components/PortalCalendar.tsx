import * as React from "react";
import type { IPortalCalendarProps } from "./IPortalCalendarProps";

export default class PortalCalendar extends React.Component<IPortalCalendarProps> {
	public render(): React.ReactElement<IPortalCalendarProps> {
		const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		// Simple placeholder matrix for one month view
		const weeks = Array.from({ length: 5 }, () =>
			Array.from({ length: 7 }, () => "—"),
		);

		return (
			<section className="rounded-xl border border-slater-800 bg-white shadow-sm">
				<header className="flex items-center justify-between border-b border-slater-800 px-4 py-3 bg-[#e6e6e6] rounded-t-xl">
					<h4 className="text-base font-semibold text-slate-800">
						Calendar / Events / Trainings
					</h4>
					<div className="flex items-center gap-2">
						<button className="rounded-md border border-slate-300 px-2 py-1 text-sm">
							&larr;
						</button>
						<span className="text-sm text-slate-700">October</span>
						<button className="rounded-md border border-slate-300 px-2 py-1 text-sm">
							&rarr;
						</button>
					</div>
				</header>

				<div className="p-1 w-[100%]">
					<table className="border-collapse table-fixed" width="100%">
						<thead>
							<tr>
								{days.map((d) => (
									<th
										key={d}
										className="px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
									>
										{d}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{weeks.map((row, i) => (
								<tr key={i} className="align-top">
									{row.map((cell, j) => (
										<td
											key={j}
											className="min-h-10 border border-slater-800 align-top p-1"
											width="14%"
										>
											<ul className="scrollbar-thin overflow-x-auto list-disc list-inside">
												<div className="text-xs text-slate-500 text-right">
													{i * 7 + j + 1}
												</div>
												<li className="rounded bg-blue-50 text-xs text-blue-800 whitespace-nowrap">
													Training (placeholder)
												</li>
												<li className="rounded bg-blue-50 text-xs text-blue-800 whitespace-nowrap">
													something else
												</li>
											</ul>
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		);
	}
}
