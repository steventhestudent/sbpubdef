import * as React from "react";
import { CalendarItem, sameDay } from "@utils/calendar";
import { PortalCalendarCellItem } from "@components/calendar/PortalCalendarCellItem";

export const PortalCalendarCell = ({
	cursor,
	items,
	date,
}: {
	cursor: Date;
	items: CalendarItem[];
	date: Date;
}): JSX.Element => {
	const today = React.useMemo(() => new Date(), []);
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
	const dayItems = byKey.get(dayKey(date)) || [];
	return (
		<td
			className={`min-h-10 border border-[var(--webpart-inner-border-color)] align-top p-1 ${inThisMonth(date) ? "" : "bg-slate-50"}`}
			width="14%"
		>
			<div className="text-xs text-slate-500 text-right">
				{date.getDate()}
				{sameDay(date, today) && (
					<span className="ml-2 inline-flex items-center rounded px-1 text-[10px] bg-blue-100 text-blue-800">
						today
					</span>
				)}
			</div>

			<ul className="space-y-1 mt-1 max-h-[5.7em] overflow-y-auto pr-1">
				{dayItems.length === 0
					? null
					: dayItems.map((item, i) => (
							<PortalCalendarCellItem key={i} item={item} />
						))}
			</ul>
		</td>
	);
};
