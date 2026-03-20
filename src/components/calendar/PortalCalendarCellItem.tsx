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
			className={`overflow-hidden rounded px-1 py-0.5 text-xs text-ellipsis whitespace-nowrap ${
				item.kind === "event"
					? "bg-blue-50 text-blue-800"
					: "bg-amber-50 text-amber-900"
			}`}
			onMouseEnter={onMouseEnter}
			onMouseMove={onMouseEnter}
			onMouseLeave={onMouseLeave}
		>
			{item.href ? (
				<a
					className="block hover:underline"
					href={item.href}
					target={
						item.href.includes("#hoteling") ? "_self" : "_blank"
					}
					rel="noopener noreferrer"
				>
					<span className="font-medium">{item.timeLabel || "—"}</span>{" "}
					<span>{item.title}</span>
					{item.location && (
						<span className="text-slate-500">
							{" "}
							— {item.location}
						</span>
					)}
					{item.meta && (
						<span className="ml-1 text-slate-500">
							({item.meta})
						</span>
					)}
				</a>
			) : (
				<>
					<span className="font-medium">{item.timeLabel || "—"}</span>{" "}
					<span>{item.title}</span>
					{item.location && (
						<span className="text-slate-500">
							{" "}
							— {item.location}
						</span>
					)}
					{item.meta && (
						<span className="ml-1 text-slate-500">
							({item.meta})
						</span>
					)}
				</>
			)}
		</li>
	);
};
