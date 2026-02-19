import * as React from "react";
import type { IUpcomingEventsProps } from "./IUpcomingEventsProps";
import type { PDEvent } from "@type/PDEvent";
import { Collapsible } from "@components/Collapsible";
import { EventsApi } from "@api/events/EventsApi";
import * as Utils from "@utils";
import { PDRoleBasedSelect } from "@components/PDRoleBasedSelect";
import RoleBasedViewProps from "@type/RoleBasedViewProps";

function PDIntranetView({
	userGroupNames,
	pnpWrapper,
}: RoleBasedViewProps): JSX.Element {
	const [items, setItems] = React.useState<PDEvent[]>([]);

	const defaultItems: PDEvent[] = [
		{
			id: "",
			title: "No Events (0 results)",
		},
	];

	const load = React.useCallback(async (): Promise<void> => {
		try {
			const eventsApi = new EventsApi(pnpWrapper);
			const rows = await eventsApi.getCombinedEvents(pnpWrapper.ctx, {
				includeOutlook: true,
			});

			const mapped = (rows || []).map((item: PDEvent) => ({
				id: item.id,
				title: item.title,
				date: item.date,
				location: item.location,
				detailsUrl: item.detailsUrl,
			}));

			setItems(mapped.length ? mapped : defaultItems);
		} catch (error) {
			console.error("Failed to load upcoming events:", error);
			setItems(defaultItems);
		}
	}, []);

	React.useEffect(() => {
		Utils.loadCachedThenFresh(load);
	}, [load]);

	return (
		<section className="rounded-xl border border-slate-200 bg-white shadow-sm">
			<div className="overflow-y-auto max-h-72">
				<table
					className="min-w-full divide-y divide-slate-200 table-fixed"
					width="100%"
				>
					<thead className="bg-slate-50 sticky top-0">
						<tr>
							<th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
								Event
							</th>
							<th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
								Details
							</th>
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
									<td className="px-1 py-1 text-sm text-slate-800">
										{event.detailsUrl ? (
											<a
												href={event.detailsUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="text-blue-700 hover:underline"
											>
												{event.title}
											</a>
										) : (
											<span className="text-slate-400">
												{event.title}
											</span>
										)}
									</td>

									<td className="px-1 py-1 text-sm text-slate-800">
										<div className="px-1 py-1 text-[var(--pd-muted)] whitespace-nowrap text-xs">
											{eventDate} @ {eventTime}
										</div>
										<div className="p-1 text-slate-700 text-sm">
											{event.location || "—"}
										</div>
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
