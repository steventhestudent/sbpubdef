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
		<div className="flex w-full items-center justify-between">
			<h4 className="text-base font-semibold text-slate-800">
				Calendar / Events / Trainings
			</h4>
			<div className="flex items-center gap-2">
				<button
					onClick={gotoPrev}
					className="rounded border border-slate-300 px-3 py-2 text-lg leading-none font-medium text-slate-700 hover:bg-slate-50"
				>
					&larr;
				</button>
				<span className="min-w-[10rem] text-center text-base font-semibold text-slate-800">
					{formatMonthYear(cursor)}
				</span>
				<button
					onClick={gotoNext}
					className="rounded border border-slate-300 px-3 py-2 text-lg leading-none font-medium text-slate-700 hover:bg-slate-50"
				>
					&rarr;
				</button>
				<button
					onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
						e.stopPropagation();
						refreshCalendar();
					}}
					disabled={loading}
					className="rounded border border-slate-300 px-3 py-2 text-lg leading-none font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
				>
					⟳
				</button>
			</div>
		</div>
	);
};
