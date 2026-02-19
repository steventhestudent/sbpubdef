import * as React from "react";
import { formatMonthYear } from "@utils/calendar";

export const PortalCalendarHeader = ({
	cursor,
	setCursor,
}: {
	cursor: Date;
	setCursor: React.Dispatch<React.SetStateAction<Date>>;
}): JSX.Element => {
	const gotoPrev: (e: React.MouseEvent<HTMLButtonElement>) => void = (
		e: React.MouseEvent<HTMLButtonElement>,
	) => {
		e.stopPropagation();
		const d = new Date(cursor);
		d.setMonth(cursor.getMonth() - 1);
		setCursor(d);
	};
	const gotoNext: (e: React.MouseEvent<HTMLButtonElement>) => void = (
		e: React.MouseEvent<HTMLButtonElement>,
	) => {
		e.stopPropagation();
		const d = new Date(cursor);
		d.setMonth(cursor.getMonth() + 1);
		setCursor(d);
	};

	return (
		<>
			<h4 className="text-base font-semibold text-slate-800 float-left mt-[0.25em]">
				Calendar / Events / Trainings
			</h4>
			<div className="flex items-center gap-2 float-right">
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
		</>
	);
};
