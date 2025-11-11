import * as React from "react";
import type { IUpcomingEventsProps } from "./IUpcomingEventsProps";

export default class UpcomingEvents extends React.Component<IUpcomingEventsProps> {
	public render(): React.ReactElement<IUpcomingEventsProps> {
		const events = [
			{
				date: "Nov 5",
				time: "12:00 PM",
				title: "CLE: Recent Case Law",
				where: "Teams",
			},
			{
				date: "Nov 12",
				time: "9:00 AM",
				title: "Investigator Workshop",
				where: "Santa Maria",
			},
			{
				date: "Nov 20",
				time: "3:00 PM",
				title: "Office Hours: IT",
				where: "SB Courthouse",
			},
		];
		return (
			<section className="rounded-xl border border-[var(--webpart-border-color)] bg-[var(--webpart-bg-color)] shadow-sm">
				<header className="border-b border-slater-800 px-4 py-3 bg-[var(--webpart-header-bg-color)] rounded-t-xl">
					<h4 className="text-base font-semibold text-slate-800">
						Upcoming Events
					</h4>
				</header>
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-slater-800">
						<thead className="bg-slate-50">
							<tr>
								{["Date", "Time", "Event", "Location", ""].map(
									(h) => (
										<th
											key={h}
											className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
										>
											{h}
										</th>
									),
								)}
							</tr>
						</thead>
						<tbody className="divide-y divide-slater-800">
							{events.map((e, i) => (
								<tr key={i} className="hover:bg-slate-50">
									<td className="px-4 py-3 text-sm text-slate-800">
										{e.date}
									</td>
									<td className="px-4 py-3 text-sm text-slate-700">
										{e.time}
									</td>
									<td className="px-4 py-3 text-sm text-slate-800">
										{e.title}
									</td>
									<td className="px-4 py-3 text-sm text-slate-700">
										{e.where}
									</td>
									<td className="px-4 py-3 text-right">
										<a
											href="#"
											className="text-sm text-blue-700 hover:underline"
										>
											Details
										</a>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		);
	}
}
