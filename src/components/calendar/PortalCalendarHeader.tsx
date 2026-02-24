import * as React from "react";
import { formatMonthYear } from "@utils/calendar";

export const PortalCalendarHeader = ({
	cursor,
	setCursor,
	loading,
	refreshCalendar,
}: {
	cursor: Date;
	setCursor: React.Dispatch<React.SetStateAction<Date>>;
	loading: boolean;
	refreshCalendar: () => void;
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
				<button
					className="hover:bg-gray-800 absolute w-[1em] h-[1em] ml-[2em] mt-[-0.07em] pb-[0.2em] rounded-md border border-slate-300 text-2xl/0 bg-[#c9cbcc] disabled:opacity-50 disabled:cursor-not-allowed"
					onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
						e.stopPropagation();
						refreshCalendar();
					}}
					disabled={loading}
				>
					⟳
				</button>
			</h4>
			<div className="flex items-center gap-2 float-right">
				<button
					onClick={gotoPrev}
					className="rounded-md border border-slate-300 px-2 py-1 text-sm bg-[#c9cbcc] hover:bg-gray-800"
				>
					&larr;
				</button>
				<span className="text-sm text-slate-700">
					{formatMonthYear(cursor)}
				</span>
				<button
					onClick={gotoNext}
					className="rounded-md border border-slate-300 px-2 py-1 text-sm bg-[#c9cbcc] hover:bg-gray-800"
				>
					&rarr;
				</button>
			</div>
		</>
	);
};
