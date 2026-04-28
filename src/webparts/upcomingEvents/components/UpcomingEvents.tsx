import * as React from "react";
import type { IUpcomingEventsProps } from "./IUpcomingEventsProps";
import type { PDEvent } from "@type/PDEvent";
import { Collapsible } from "@components/Collapsible";
import { EventsApi } from "@api/events/EventsApi";
import { PDRoleBasedSelect } from "@components/PDRoleBasedSelect";
import RoleBasedViewProps from "@type/RoleBasedViewProps";
import { GraphClient, MSGraphClientV3 } from "@utils/graph/GraphClient";
import { getEventLocalStart } from "@utils/calendar";
import * as Utils from "@utils";
import { ENV_CANVIEW } from "@utils/rolebased/ENV";

const PAGE_SIZE = 5;

function AddToCalendarMailboxIcon({
	className,
}: {
	className?: string;
}): JSX.Element {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.65"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<rect x="2.5" y="5" width="15" height="11" rx="1.75" fill="none" />
			<path fill="none" d="m3.5 6.5 6.4 4.15a2 2 0 0 0 2.1 0L17.5 6.5" />
			<circle
				cx="18"
				cy="17"
				r="3.35"
				className="fill-slate-500 transition-colors group-hover:fill-blue-600"
			/>
			<path
				d="M18 15.15v3.7M16.15 17h3.7"
				stroke="#fff"
				strokeWidth="1.65"
			/>
		</svg>
	);
}

function ChevronLeftIcon({ className }: { className?: string }): JSX.Element {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="m15 18-6-6 6-6" />
		</svg>
	);
}

function ChevronRightIcon({ className }: { className?: string }): JSX.Element {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="m9 18 6-6-6-6" />
		</svg>
	);
}

function PDIntranetView({
	userGroupNames,
	pnpWrapper,
	sourceRole,
}: RoleBasedViewProps): JSX.Element {
	const [allItems, setAllItems] = React.useState<PDEvent[]>([]);
	const [page, setPage] = React.useState(0);
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
			// Announcements-style: SharePoint PD Events only (no Outlook items).
			const rows = await eventsApi.get(200);

			const mapped = (rows || []).map((item: PDEvent) => ({
				id: item.id,
				title: item.title,
				date: item.date,
				endDate: item.endDate,
				allDay: item.allDay,
				location: item.location,
				detailsUrl: item.detailsUrl,
				PDDepartment: item.PDDepartment,
			}));

			setAllItems(mapped.length ? mapped : defaultItems);
			setPage(0);
		} catch (error) {
			console.error("Failed to load upcoming events:", error);
			setAllItems(defaultItems);
			setPage(0);
		}
	}, []);

	React.useEffect(() => {
		pnpWrapper.loadCachedThenFresh(load);
	}, [load]);

	const isUserIT = Utils.isIT(userGroupNames);
	const items = React.useMemo(() => {
		// Keep default placeholder behavior.
		if (allItems.length === 1 && allItems[0].id === 0 && !allItems[0].date)
			return allItems;

		// Filter by PDDepartment for selected department.
		// If the current user is IT, always show all departments.
		return allItems.filter((el) => {
			if (isUserIT) return true;
			const effectiveRole = sourceRole || "EVERYONE";
			const allowed = new Set<string>([
				"EVERYONE",
				effectiveRole,
				...ENV_CANVIEW(effectiveRole),
			]);
			return allowed.has(el.PDDepartment || "");
		});
	}, [allItems, isUserIT, sourceRole]);

	React.useEffect(() => {
		const empty = items.length === 1 && items[0].id === 0 && !items[0].date;
		const tp = empty ? 1 : Math.max(1, Math.ceil(items.length / PAGE_SIZE));
		setPage((p) => Math.min(p, Math.max(0, tp - 1)));
	}, [items]);

	const isPlaceholderEmpty =
		items.length === 1 && items[0].id === 0 && !items[0].date;

	const totalPages = isPlaceholderEmpty
		? 1
		: Math.max(1, Math.ceil(items.length / PAGE_SIZE));
	const safePage = Math.min(page, totalPages - 1);
	const pageStart = safePage * PAGE_SIZE;
	const pageItems = isPlaceholderEmpty
		? items
		: items.slice(pageStart, pageStart + PAGE_SIZE);
	const showPagination = !isPlaceholderEmpty && items.length > PAGE_SIZE;
	const rangeLabel = isPlaceholderEmpty
		? ""
		: `${pageStart + 1}–${Math.min(pageStart + pageItems.length, items.length)} of ${items.length}`;

	const addToOutlookCalendar = async (event: PDEvent): Promise<void> => {
		if (!event.date) {
			setCalendarStatus({
				type: "error",
				text: `Cannot add "${event.title}" to Outlook because the event date is missing.`,
			});
			return;
		}

		const start = getEventLocalStart(event) ?? new Date(event.date || "");
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
		<section className="min-h-[23em] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
			{calendarStatus && (
				<div
					className={`mx-3 mt-3 rounded-lg border px-3 py-2 text-sm ${
						calendarStatus.type === "success"
							? "border-emerald-200 bg-emerald-50 text-emerald-900"
							: "border-red-200 bg-red-50 text-red-900"
					}`}
				>
					{calendarStatus.text}
				</div>
			)}

			<div className="max-h-[28rem] overflow-y-auto">
				{isPlaceholderEmpty ? (
					<div className="px-6 py-12 text-center text-sm text-slate-500">
						No upcoming events found.
					</div>
				) : (
					<ul className="divide-y divide-slate-100">
						{pageItems.map((event) => {
							const eventDateObj =
								getEventLocalStart(event) ??
								new Date(event.date || "");
							const shortMonth = eventDateObj.toLocaleDateString(
								undefined,
								{ month: "short" },
							);
							const dayNum = eventDateObj.getDate();
							const yearNum = eventDateObj.getFullYear();
							const weekday = eventDateObj.toLocaleDateString(
								undefined,
								{ weekday: "short" },
							);
							const eventTime = event.allDay
								? "All day"
								: eventDateObj.toLocaleTimeString(undefined, {
										hour: "numeric",
										minute: "2-digit",
									});
							const metaWhen = event.allDay
								? `${weekday}, ${shortMonth} ${dayNum}, ${yearNum}`
								: `${weekday}, ${shortMonth} ${dayNum}, ${yearNum} · ${eventTime}`;

							const titleNode = event.detailsUrl ? (
								<a
									href={event.detailsUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="font-semibold text-slate-900 decoration-slate-300 underline-offset-2 hover:text-blue-800 hover:underline"
								>
									{event.title}
								</a>
							) : (
								<span className="font-semibold text-slate-800">
									{event.title}
								</span>
							);

							const departmentBadge = event.PDDepartment ? (
								<span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700">
									{Utils.ENV_ROLE_DISPLAY(event.PDDepartment)}
								</span>
							) : null;

							return (
								<li key={event.id}>
									<div className="flex gap-3 px-3 py-3 sm:gap-4 sm:px-4">
										<div className="flex w-[4.25rem] shrink-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white px-1.5 py-2 text-center shadow-sm">
											<span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
												{shortMonth}
											</span>
											<span className="text-[1.35rem] leading-none font-bold text-slate-900 tabular-nums">
												{dayNum}
											</span>
											{!event.allDay && (
												<span className="mt-1 max-w-full truncate text-[11px] font-medium text-slate-600">
													{eventTime}
												</span>
											)}
											{event.allDay && (
												<span className="mt-1 text-[9px] font-semibold tracking-wide text-blue-700 uppercase">
													All day
												</span>
											)}
										</div>

										<div className="min-w-0 flex-1 py-0.5">
											<p className="text-xs leading-snug text-slate-500">
												{metaWhen}
											</p>
											<div className="mt-1.5 flex flex-wrap items-center gap-2 text-base leading-snug sm:text-[15px]">
												<span className="min-w-0">
													{titleNode}
												</span>
												{departmentBadge}
											</div>
											<div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-600">
												<span className="inline-flex items-center gap-1">
													<svg
														className="h-3.5 w-3.5 shrink-0 text-slate-400"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														strokeWidth="2"
														aria-hidden
													>
														<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
														<circle
															cx="12"
															cy="10"
															r="3"
														/>
													</svg>
													<span className="min-w-0 break-words">
														{event.location?.trim()
															? event.location
															: "Location TBD"}
													</span>
												</span>
											</div>
										</div>

										<div className="flex shrink-0 flex-col items-center justify-center self-center">
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
																	: String(
																			error,
																		)
															}`,
														});
													});
												}}
												disabled={
													addingEventId === event.id
												}
												className="group rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
												aria-label="Add to my Outlook calendar"
												title="Add to my calendar"
											>
												{addingEventId === event.id ? (
													<span
														className="block h-6 w-6 animate-pulse rounded-md bg-slate-200"
														aria-hidden
													/>
												) : (
													<AddToCalendarMailboxIcon className="h-6 w-6" />
												)}
											</button>
										</div>
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</div>

			{showPagination && (
				<footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/90 px-3 py-2.5 sm:px-4">
					<span className="text-xs text-slate-600 tabular-nums">
						{rangeLabel}
					</span>
					<div className="flex items-center gap-1">
						<button
							type="button"
							className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-35"
							disabled={safePage <= 0}
							onClick={() => setPage((p) => Math.max(0, p - 1))}
							aria-label="Previous page"
						>
							<ChevronLeftIcon className="h-5 w-5" />
						</button>
						<button
							type="button"
							className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-35"
							disabled={safePage >= totalPages - 1}
							onClick={() =>
								setPage((p) => Math.min(totalPages - 1, p + 1))
							}
							aria-label="Next page"
						>
							<ChevronRightIcon className="h-5 w-5" />
						</button>
					</div>
				</footer>
			)}
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
					EVERYONE: PDIntranetView,
					PDINTRANET: PDIntranetView,
					ATTORNEY: PDIntranetView,
					CDD: PDIntranetView,
					LOP: PDIntranetView,
					TRIALSUPERVISOR: PDIntranetView,
					COMPLIANCEOFFICER: PDIntranetView,
					HR: PDIntranetView,
					IT: PDIntranetView,
				}}
			/>
		</Collapsible>
	);
}
