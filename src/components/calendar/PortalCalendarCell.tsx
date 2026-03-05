import * as React from "react";
import { CalendarItem, sameDay, wheelHandler } from "@utils/calendar";
import { PortalCalendarCellItem } from "@components/calendar/PortalCalendarCellItem";

export const PortalCalendarCell = ({
	cursor,
	items,
	date,
	onMouseEnterItem = (item: CalendarItem) => (e) => {},
	onMouseLeaveItem = (item: CalendarItem) => (e) => {},
}: {
	cursor: Date;
	items: CalendarItem[];
	date: Date;
	onMouseEnterItem?: (
		item: CalendarItem,
	) => (e: React.MouseEvent<HTMLLIElement>) => void;
	onMouseLeaveItem?: (
		item: CalendarItem,
	) => (e: React.MouseEvent<HTMLLIElement>) => void;
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

	React.useEffect(() => {
		document.addEventListener("wheel", wheelHandler, { passive: false });
	}, []);

	return (
		<td
			className={`min-h-10 border border-slate-300 p-2 align-top ${inThisMonth(date) ? "" : "bg-slate-50"}`}
			width="14%"
		>
			<div className="text-right text-xs text-slate-500">
				{date.getDate()}
				{sameDay(date, today) && (
					<span className="ml-2 inline-flex items-center rounded bg-blue-100 px-1 text-[10px] text-blue-800">
						today
					</span>
				)}
			</div>

			<ul className="mt-1 max-h-[5.7em] space-y-1 overflow-hidden pr-1">
				{dayItems.length === 0
					? null
					: dayItems.map((item, i) => (
							<PortalCalendarCellItem
								key={i}
								item={item}
								onMouseEnter={onMouseEnterItem(item)}
								onMouseLeave={onMouseLeaveItem(item)}
							/>
						))}
			</ul>
		</td>
	);
};
