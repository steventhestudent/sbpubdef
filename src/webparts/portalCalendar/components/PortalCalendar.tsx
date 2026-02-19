import * as React from "react";
import type { IPortalCalendarProps } from "./IPortalCalendarProps";
import { Collapsible } from "@components/Collapsible";
import { PortalCalendarHeader } from "@components/calendar/PortalCalendarHeader";
import { buildMonthMatrix } from "@utils/calendar";
import { PortalCalendarCell } from "@components/calendar/PortalCalendarCell";
import { useCalendarData } from "@api/calendar";

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

	const weeks = React.useMemo(
		() => buildMonthMatrix(cursor.getFullYear(), cursor.getMonth()),
		[cursor],
	);

	return (
		<Collapsible
			instanceId={props.context.instanceId}
			hideChevron={true}
			title={
				<PortalCalendarHeader cursor={cursor} setCursor={setCursor} />
			}
		>
			<div className="p-1 w-full">
				<table className="border-collapse table-fixed w-full">
					<thead>
						<tr>
							{[
								"Sun",
								"Mon",
								"Tue",
								"Wed",
								"Thu",
								"Fri",
								"Sat",
							].map((d) => (
								<th
									key={d}
									className="px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
								>
									{d}
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
									/>
								))}
							</tr>
						))}
					</tbody>
				</table>

				{loading && (
					<div className="p-2 text-xs text-slate-500">Loading…</div>
				)}
			</div>
		</Collapsible>
	);
}
