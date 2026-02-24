import * as React from "react";
import { CalendarItem } from "@utils/calendar";

export type PortalCalendarTooltipShowOptions = {
	x: number;
	y: number;
	title: string;
	timeLabel?: string;
	location?: string;
	meta?: string;
};

export const tooltipEnter = (
	setTooltipShowOptions: React.Dispatch<
		React.SetStateAction<PortalCalendarTooltipShowOptions | undefined>
	>,
	item: CalendarItem,
	$rel: React.RefObject<HTMLDivElement>,
): ((e: React.MouseEvent<HTMLLIElement>) => void) => {
	return (e: React.MouseEvent<HTMLLIElement>) => {
		const relRect = $rel.current!.getClientRects()[0];
		console.log(
			e.clientX - relRect.left,
			e.clientY - relRect.top,
			$rel.current,
		);
		setTooltipShowOptions({
			x: e.clientX + 12,
			y: e.clientY + 12,
			title: item.title,
			timeLabel: item.timeLabel,
			location: item.location,
			meta: item.meta,
		});
	};
};

export function isThisElTooltip(el: Element): boolean {
	return el.id === "PortalCalendarTooltip";
}

export const tooltipLeave = (
	setTooltipShowOptions: React.Dispatch<
		React.SetStateAction<PortalCalendarTooltipShowOptions | undefined>
	>,
	item: CalendarItem,
): ((e: React.MouseEvent<HTMLLIElement>) => void) => {
	return (e: React.MouseEvent<HTMLLIElement>) => {
		const elementUnderMouse = document.elementFromPoint(
			e.clientX,
			e.clientY,
		);
		if (elementUnderMouse && isThisElTooltip(elementUnderMouse)) return;
		setTooltipShowOptions(undefined);
	};
};

export function PortalCalendarTooltip({
	showOptions,
	setTooltipShowOptions,
}: {
	showOptions?: PortalCalendarTooltipShowOptions;
	setTooltipShowOptions: React.Dispatch<
		React.SetStateAction<PortalCalendarTooltipShowOptions | undefined>
	>;
}): JSX.Element {
	return !showOptions ? (
		<></>
	) : (
		<div
			className="fixed z-50 w-64 rounded-md border border-slate-300 bg-white p-3 shadow-lg"
			style={{ left: showOptions.x, top: showOptions.y }}
		>
			<p className="text-sm font-semibold text-slate-800">
				{showOptions.title}
			</p>
			{showOptions.timeLabel && (
				<p className="mt-1 text-xs text-slate-600">
					Time: {showOptions.timeLabel}
				</p>
			)}
			{showOptions.location && (
				<p className="text-xs text-slate-600">
					Location: {showOptions.location}
				</p>
			)}
			{showOptions.meta && (
				<p className="text-xs text-slate-500">{showOptions.meta}</p>
			)}
		</div>
	);
}
