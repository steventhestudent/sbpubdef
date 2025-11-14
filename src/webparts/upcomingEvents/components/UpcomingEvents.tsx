import * as React from "react";

import type { IUpcomingEventsProps } from "./IUpcomingEventsProps";

import { Collapsible } from "@components/Collapsible";
import { EventsApi } from "@api/events";
import type { PDEvent } from "@type/PDEvent";
import * as Utils from "@utils";
import RoleBasedViewProps from "@type/RoleBasedViewProps";
import { PDRoleBasedSelect } from "@components/PDRoleBasedSelect";

type UpcomingEventsComponentItem = PDEvent;

function PDIntranetView({
	userGroupNames,
	pnpWrapper,
}: RoleBasedViewProps): JSX.Element {
	const defaultItems: UpcomingEventsComponentItem[] = [
		{
			title: "No Events (0 results)",
		},
	];
	const [items, setItems] = React.useState(defaultItems);
	const eventsApi = new EventsApi(pnpWrapper);

	const load: () => Promise<void> = async () => {
		const rows = await eventsApi.get(12); // strategy auto
		const mapped = (rows || []).map((item: PDEvent) => ({
			id: item.id,
			title: item.title,
			date: item.date,
			location: item.location,
			detailsUrl: item.detailsUrl,
		}));
		setItems(mapped.length ? mapped : defaultItems);
	};

	React.useEffect(() => {
		Utils.loadCachedThenFresh(load);
	}, []);

	return (
		<section className="rounded-xl border border-slate-200 bg-white shadow-sm">
			<div className="overflow-y-auto max-h-96">
				<table className="min-w-full divide-y divide-slate-200">
					<thead className="bg-slate-50 sticky top-0">
						<tr>
							<th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
								Dates
							</th>
							<th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
								Time
							</th>
							<th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
								Event
							</th>
							<th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
								Location
							</th>
							<th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600" />
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-200">
						{items.length === 0 && (
							<tr>
								<td
									colSpan={5}
									className="px-4 py-6 text-center text-sm text-slate-500"
								>
									No upcoming events found.
								</td>
							</tr>
						)}
						{items.map((event) => {
							const eventDateObj = new Date(event.date || "");
							const eventDate = eventDateObj.toLocaleDateString(
								undefined,
								{
									month: "short",
									day: "numeric",
									year: "numeric",
								},
							);
							const eventTime = eventDateObj.toLocaleTimeString(
								undefined,
								{
									hour: "numeric",
									minute: "2-digit",
								},
							);

							return (
								<tr
									key={event.id}
									className="hover:bg-slate-50"
								>
									<td className="px-4 py-3 text-sm text-slate-800 whitespace-nowrap">
										{eventDate}
									</td>
									<td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
										{eventTime}
									</td>
									<td className="px-4 py-3 text-sm text-slate-800">
										{event.title}
									</td>
									<td className="px-4 py-3 text-sm text-slate-700">
										{event.location || "—"}
									</td>
									<td className="px-4 py-3 text-right">
										<a
											href={event.detailsUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="text-sm text-blue-700 hover:underline"
										>
											Details
										</a>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</section>
	);
}

export function UpcomingEvents(props: IUpcomingEventsProps): JSX.Element {
	return (
		<Collapsible
			instanceId={props.context.instanceId}
			title="Upcoming Events"
		>
			<PDRoleBasedSelect
				ctx={props.context}
				showSelect={true}
				selectLabel="Department"
				views={{
					Everyone: PDIntranetView,
					PDIntranet: PDIntranetView,
					Attorney: PDIntranetView,
					LOP: PDIntranetView,
					HR: PDIntranetView,
					IT: PDIntranetView,
				}}
			/>
		</Collapsible>
	);
}
