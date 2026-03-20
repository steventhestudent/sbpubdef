import * as React from "react";
import type { IUpcomingEventsProps } from "./IUpcomingEventsProps";
import type { PDEvent } from "@type/PDEvent";
import { Collapsible } from "@components/Collapsible";
import { EventsApi } from "@api/events/EventsApi";
import { PDRoleBasedSelect } from "@components/PDRoleBasedSelect";
import RoleBasedViewProps from "@type/RoleBasedViewProps";
import { GraphClient, MSGraphClientV3 } from "@utils/graph/GraphClient";

function PDIntranetView({
	userGroupNames,
	pnpWrapper,
}: RoleBasedViewProps): JSX.Element {
	const [items, setItems] = React.useState<PDEvent[]>([]);
	const [addingEventId, setAddingEventId] = React.useState<
		string | number | null
	>(null);
	const [calendarStatus, setCalendarStatus] = React.useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);

	const defaultItems: PDEvent[] = [
		{
			id: 0,
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
		pnpWrapper.loadCachedThenFresh(load);
	}, [load]);

	const addToOutlookCalendar = async (event: PDEvent): Promise<void> => {
		if (!event.date) {
			setCalendarStatus({
				type: "error",
				text: `Cannot add "${event.title}" to Outlook because the event date is missing.`,
			});
			return;
		}

		const start = new Date(event.date);
		if (isNaN(start.getTime())) {
			setCalendarStatus({
				type: "error",
				text: `Cannot add "${event.title}" to Outlook because the event date is invalid.`,
			});
			return;
		}

		const end = new Date(start.getTime() + 60 * 60 * 1000);

		setAddingEventId(event.id);
		try {
			const client: MSGraphClientV3 = await GraphClient(pnpWrapper.ctx);
			await client.api("/me/events").post({
				subject: event.title,
				start: {
					dateTime: start.toISOString(),
					timeZone: "UTC",
				},
				end: {
					dateTime: end.toISOString(),
					timeZone: "UTC",
				},
				location: {
					displayName: event.location || "",
				},
				body: {
					contentType: "HTML",
					content: `<p>Added from Upcoming Events.</p>${event.detailsUrl ? `<p><a href="${event.detailsUrl}">View details</a></p>` : ""}`,
				},
			});

			setCalendarStatus({
				type: "success",
				text: `Added "${event.title}" to your Outlook calendar.`,
			});
		} catch (error) {
			const message =
				error instanceof Error ? error.message : String(error);
			setCalendarStatus({
				type: "error",
				text: `Failed to add "${event.title}" to Outlook: ${message}`,
			});
		} finally {
			setAddingEventId(null);
		}
	};

	return (
		<section className="rounded-xl border border-slate-200 bg-white shadow-sm">
			{calendarStatus && (
				<div
					className={`mx-3 mt-3 rounded border px-3 py-2 text-sm ${
						calendarStatus.type === "success"
							? "border-green-300 bg-green-50 text-green-800"
							: "border-red-300 bg-red-50 text-red-800"
					}`}
				>
					{calendarStatus.text}
				</div>
			)}
			<div className="max-h-96 overflow-y-auto">
				<table
					className="min-w-full table-fixed divide-y divide-slate-200"
					width="100%"
				>
					<thead className="sticky top-0 bg-slate-50">
						<tr>
							<th className="px-4 py-2 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase">
								Event
							</th>
							<th className="px-4 py-2 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase">
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
										<div className="px-1 py-1 text-xs whitespace-nowrap text-[var(--pd-muted)]">
											{eventDate} @ {eventTime}
										</div>
										<div className="p-1 text-sm text-slate-700">
											{event.location || "—"}
										</div>
										<button
											type="button"
											onClick={() => {
												addToOutlookCalendar(
													event,
												).catch((error) => {
													setCalendarStatus({
														type: "error",
														text: `Failed to add "${event.title}" to Outlook: ${
															error instanceof
															Error
																? error.message
																: String(error)
														}`,
													});
												});
											}}
											disabled={
												addingEventId === event.id
											}
											className="mt-1 ml-1 inline-flex text-xs text-blue-700 hover:underline disabled:text-slate-400 disabled:no-underline"
										>
											{addingEventId === event.id
												? "Adding..."
												: "Add to my calendar"}
										</button>
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
