import * as React from "react";
import type { IPortalCalendarProps } from "./IPortalCalendarProps";
import { useCalendarData } from "@components/calendar/useCalendarData";
import {
	buildMonthMatrix,
	sameDay,
	formatMonthYear,
} from "@components/calendar/utils";

export default function PortalCalendar(
	props: IPortalCalendarProps,
): JSX.Element {
	const sites = ["/sites/PD-Intranet", "/sites/Tech-Team", "/sites/HR"]; // or from props
	const { items, loading, load } = useCalendarData(props.context, sites);

	const today = React.useMemo(() => new Date(), []);
	const [cursor, setCursor] = React.useState(() => {
		const d = new Date();
		d.setDate(1);
		return d;
	});

	React.useEffect(() => {
		if (!loading && !items.length) {
			console.log(`loading calendar`);
			setTimeout(async () => await load({ includeOutlook: true }));
		}
	}, []); // load as dep causes infinite re-runs. just load onmount, since: //todo: scope useCalendarData within ±1 month (currently loading ALL calendar data ever) —— then reloads become necessary

	const weeks = React.useMemo(
		() => buildMonthMatrix(cursor.getFullYear(), cursor.getMonth()),
		[cursor],
	);

	const gotoPrev: () => void = () => {
		const d = new Date(cursor);
		d.setMonth(cursor.getMonth() - 1);
		setCursor(d);
	};
	const gotoNext: () => void = () => {
		const d = new Date(cursor);
		d.setMonth(cursor.getMonth() + 1);
		setCursor(d);
	};
	const inThisMonth: (d: Date) => boolean = (d: Date) =>
		d.getMonth() === cursor.getMonth();

	// group items by yyyy-mm-dd
	const byKey = React.useMemo(() => {
		const map = new Map<string, typeof items>();
		for (const it of items) {
			const key = `${it.when.getFullYear()}-${it.when.getMonth()}-${it.when.getDate()}`;
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(it);
		}
		return map;
	}, [items]);

	const dayKey: (d: Date) => string = (d: Date) =>
		`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

	return (
		<section className="rounded-xl border border-[var(--webpart-border-color)] bg-[var(--webpart-bg-color)] shadow-sm">
			<header className="flex items-center justify-between border-b border-slate-300 px-4 py-3 bg-[var(--webpart-header-bg-color)] rounded-t-xl">
				<h4 className="text-base font-semibold text-slate-800">
					Calendar / Events / Trainings
				</h4>
				<div className="flex items-center gap-2">
					<button
						onClick={gotoPrev}
						className="rounded-md border border-slate-300 px-2 py-1 text-sm bg-[#c9cbcc]"
					>
						&larr;
					</button>
					<span className="text-sm text-slate-700">
						{formatMonthYear(cursor)}
					</span>
					<button
						onClick={gotoNext}
						className="rounded-md border border-slate-300 px-2 py-1 text-sm bg-[#c9cbcc]"
					>
						&rarr;
					</button>
				</div>
			</header>

			<div className="p-1 w-full">
				<table className="border-collapse table-fixed w-full">
					<thead>
						<tr>
							{[
								"Sun",
								"Mon",
								"Tue",
								"Wed",
								"Thu",
								"Fri",
								"Sat",
							].map((d) => (
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
								{row.map((d, j) => {
									const k = dayKey(d);
									const dayItems = byKey.get(k) || [];
									return (
										<td
											key={j}
											className={`min-h-10 border border-[var(--webpart-inner-border-color)] align-top p-1 ${inThisMonth(d) ? "" : "bg-slate-50"}`}
											width="14%"
										>
											<div className="text-xs text-slate-500 text-right">
												{d.getDate()}
												{sameDay(d, today) && (
													<span className="ml-2 inline-flex items-center rounded px-1 text-[10px] bg-blue-100 text-blue-800">
														today
													</span>
												)}
											</div>

											<ul className="space-y-1 mt-1 max-h-28 overflow-y-auto pr-1">
												{dayItems.length === 0
													? null
													: dayItems.map((item) => (
															<li
																key={item.id}
																className={`rounded px-1 py-0.5 text-xs whitespace-nowrap overflow-hidden text-ellipsis
                                         ${
												item.kind === "event"
													? "bg-blue-50 text-blue-800"
													: "bg-amber-50 text-amber-900"
											}`}
															>
																<span className="font-medium">
																	{item.timeLabel ||
																		"—"}
																</span>{" "}
																{item.href ? (
																	<a
																		className="hover:underline"
																		href={
																			item.href
																		}
																		target="_blank"
																		rel="noopener noreferrer"
																	>
																		{
																			item.title
																		}
																	</a>
																) : (
																	<span>
																		{
																			item.title
																		}
																	</span>
																)}
																{item.location && (
																	<span className="text-slate-500">
																		{" "}
																		—{" "}
																		{
																			item.location
																		}
																	</span>
																)}
																{item.meta && (
																	<span className="ml-1 text-slate-500">
																		(
																		{
																			item.meta
																		}
																		)
																	</span>
																)}
															</li>
														))}
											</ul>
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>

				{loading && (
					<div className="p-2 text-xs text-slate-500">Loading…</div>
				)}
			</div>
		</section>
	);
}
