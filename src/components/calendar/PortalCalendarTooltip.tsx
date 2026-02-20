import * as React from "react";

export type PortalCalendarTooltipShowOptions = {
	x: number;
	y: number;
};

export const tooltipEnter = (
	setTooltipShowOptions: React.Dispatch<
		React.SetStateAction<PortalCalendarTooltipShowOptions | undefined>
	>,
	$rel: React.RefObject<HTMLDivElement>,
): ((e: React.MouseEvent<HTMLLIElement>) => void) => {
	return (e: React.MouseEvent<HTMLLIElement>) => {
		const relRect = $rel.current!.getClientRects()[0];
		console.log(
			e.pageX - relRect.left,
			e.pageY - relRect.top,
			$rel.current,
		);
		setTooltipShowOptions({
			x: e.pageX - relRect.left,
			y: e.pageY - relRect.top,
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
			id="PortalCalendarTooltip"
			style={{ left: showOptions.x + "px", top: showOptions.y + "px" }}
			className="z-[99999] absolute w-[326px] h-[396px]"
		>
			Tooltip
		</div>
	);
}
