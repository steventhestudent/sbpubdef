import * as React from "react";
import { CalendarItem } from "@utils/calendar";

export const PortalCalendarCellItem = ({
	item,
	onMouseEnter,
	onMouseLeave,
}: {
	item: CalendarItem;
	onMouseEnter?: (e: React.MouseEvent<HTMLLIElement>) => void;
	onMouseLeave?: (e: React.MouseEvent<HTMLLIElement>) => void;
}): JSX.Element => {
	return (
		<li
			className={`rounded px-1 py-0.5 text-xs whitespace-nowrap overflow-hidden text-ellipsis
                                         ${
												item.kind === "event"
													? "bg-blue-50 text-blue-800"
													: "bg-amber-50 text-amber-900"
											}`}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		>
			<span className="font-medium">{item.timeLabel || "—"}</span>{" "}
			{item.href ? (
				<a
					className="hover:underline"
					href={item.href}
					target="_blank"
					rel="noopener noreferrer"
				>
					{item.title}
				</a>
			) : (
				<span>{item.title}</span>
			)}
			{item.location && (
				<span className="text-slate-500"> — {item.location}</span>
			)}
			{item.meta && (
				<span className="ml-1 text-slate-500">({item.meta})</span>
			)}
		</li>
	);
};
