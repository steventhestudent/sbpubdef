import * as React from "react";
import type { IPortalCalendarProps } from "./IPortalCalendarProps";
import { buildMonthMatrix, CalendarItem } from "@utils/calendar";
import { useCalendarData } from "@api/calendar";
import { Collapsible } from "@components/Collapsible";
import {
	PortalCalendarTooltip,
	PortalCalendarTooltipShowOptions,
	tooltipEnter,
	tooltipLeave,
} from "@components/calendar/PortalCalendarTooltip";
import { PortalCalendarHeader } from "@components/calendar/PortalCalendarHeader";
import { PortalCalendarCell } from "@components/calendar/PortalCalendarCell";

const daysStr = "Sun Mon Tue Wed Thu Fri Sat";

export default function PortalCalendar(
	props: IPortalCalendarProps,
): JSX.Element {
	const sites = ["/sites/PD-Intranet", "/sites/Tech-Team", "/sites/HR"]; // or from props
	const { items, loading, load } = useCalendarData(props.context, sites);

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

	const refreshCalendar = (): void => {
		load({ includeOutlook: true }).catch((error) => {
			console.warn("Failed to refresh calendar.", error);
		});
	};

	const weeks = React.useMemo(
		() => buildMonthMatrix(cursor.getFullYear(), cursor.getMonth()),
		[cursor],
	);

	const [tooltipShowOptions, setTooltipShowOptions] = React.useState(
		undefined as PortalCalendarTooltipShowOptions | undefined,
	);

	const $rel = React.useRef(null as HTMLDivElement | null);

	return (
		<div className="relative w-full -h-full" ref={$rel}>
			<PortalCalendarTooltip
				showOptions={tooltipShowOptions}
				setTooltipShowOptions={setTooltipShowOptions}
			/>
			<Collapsible
				instanceId={props.context.instanceId}
				hideChevron={true}
				headerClickable={false}
				headerClassName="bg-white border-b border-slate-300"
				title={
					<PortalCalendarHeader
						cursor={cursor}
						setCursor={setCursor}
						loading={loading}
						refreshCalendar={refreshCalendar}
					/>
				}
			>
				<div className="p-2 w-full overflow-x-auto">
					<table className="border-collapse table-fixed w-full border border-slate-300">
						<thead>
							<tr>
								{daysStr.split(" ").map((d) => (
									<th
										key={d}
										className="border border-slate-300 bg-slate-100 px-2 py-1 text-center text-slate-700"
									>
										<div className="text-xs font-semibold uppercase tracking-wide">
											{d}
										</div>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{weeks.map((row, i) => (
								<tr key={i} className="align-top">
									{row.map((d, j) => (
										<PortalCalendarCell
											key={j}
											cursor={cursor}
											items={items}
											date={d}
											onMouseEnterItem={(
												item: CalendarItem,
											) =>
												tooltipEnter(
													setTooltipShowOptions,
													item,
													$rel,
												)
											}
											onMouseLeaveItem={(
												item: CalendarItem,
											) =>
												tooltipLeave(
													setTooltipShowOptions,
													item,
												)
											}
										/>
									))}
								</tr>
							))}
						</tbody>
					</table>

					{loading && (
						<div className="p-2 text-xs text-slate-500">
							Loading…
						</div>
					)}
				</div>
			</Collapsible>
		</div>
	);
}
