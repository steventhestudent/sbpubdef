import * as React from "react";
import type { WebPartContext } from "@microsoft/sp-webpart-base";
import { PNPWrapper } from "@utils/PNPWrapper";
import { AssignmentsApi } from "@api/assignments";
import { EventsApi } from "@api/events/EventsApi";
import {
	CalendarItem,
	PDAssignment,
	PDEvent,
	formatTime,
	getEventLocalStart,
	toDateSafe,
} from "@utils/calendar";
import {
	HOTELING_SYNC_EVENT,
	readHotelingReservations,
} from "@services/officeHotelingSync";

// If you already have a current user email util, use that. // Otherwise, derive from ctx:
function currentUserEmail(ctx: WebPartContext): string | undefined {
	return ctx.pageContext.user.email?.toLowerCase();
}

function mapAssignmentsToCal(
	assigns: PDAssignment[],
	me?: string,
): CalendarItem[] {
	return assigns
		.map((a) => {
			const when = toDateSafe(a.nextHearing);
			if (!when) return undefined;
			const mine =
				a.isMyCase || (me && a.attorneyEmail?.toLowerCase() === me);
			return {
				id: `A-${a.id}`,
				kind: "assignment" as const,
				title: a.title,
				when,
				timeLabel: formatTime(when),
				location: undefined,
				href: a.link,
				meta: mine ? "My case" : a.status,
			} as CalendarItem;
		})
		.filter(Boolean) as CalendarItem[];
}

function mapEventsToCal(events: PDEvent[]): CalendarItem[] {
	return events
		.filter((e) => !/(office\s*)?hoteling|hotelling/i.test(e.title || ""))
		.map((e) => {
			const when = getEventLocalStart(e);
			if (!when) return undefined;

			const end = toDateSafe(e.endDate);
			const isSameDay =
				!!end &&
				when.getFullYear() === end.getFullYear() &&
				when.getMonth() === end.getMonth() &&
				when.getDate() === end.getDate();
			const durationHours = end
				? (end.getTime() - when.getTime()) / (1000 * 60 * 60)
				: 0;

			const isAllDaySelection =
				!e.allDay &&
				!!end &&
				isSameDay &&
				when.getHours() <= 8 &&
				end.getHours() >= 17 &&
				durationHours >= 8;

			const timeLabel = e.allDay
				? "All day"
				: isAllDaySelection
					? "All day (8:00 AM - 5:00 PM)"
					: formatTime(when);

			return {
				id: `E-${e.id}`,
				kind: "event" as const,
				title: e.title,
				when,
				timeLabel,
				location: e.location,
				href: e.detailsUrl,
				meta: undefined,
			} as CalendarItem;
		})
		.filter(Boolean) as CalendarItem[];
}

function mapHotelingToCal(): CalendarItem[] {
	const hotelingFallbackLink =
		typeof window !== "undefined"
			? `${window.location.pathname}${window.location.search}#hoteling`
			: undefined;

	const groups = new Map<
		string,
		ReturnType<typeof readHotelingReservations>
	>();

	readHotelingReservations().forEach((reservation) => {
		const key = reservation.date;
		const current = groups.get(key) ?? [];
		current.push(reservation);
		groups.set(key, current);
	});

	return Array.from(groups.entries())
		.map(([key, reservations]) => {
			const first = reservations[0];
			const [year, month, day] = first.date.split("-").map(Number);

			const hasMorning = reservations.some(
				(reservation) => reservation.time === "Morning",
			);
			const hasAfternoon = reservations.some(
				(reservation) => reservation.time === "Afternoon",
			);

			const hour = hasAfternoon && !hasMorning ? 12 : 8;
			const when = new Date(year, month - 1, day, hour, 0, 0, 0);
			if (isNaN(when.getTime())) return undefined;

			const uniqueLocations = Array.from(
				new Set(
					reservations.map((reservation) => reservation.location),
				),
			);

			const timeLabel =
				hasMorning && hasAfternoon
					? "All Day"
					: hasMorning
						? "Morning"
						: "Afternoon";

			const linkSource =
				reservations.find(
					(reservation) =>
						!!reservation.sharePointEventWebLink ||
						!!reservation.outlookEventWebLink,
				) ?? reservations[reservations.length - 1];

			return {
				id: `H-${key}`,
				kind: "event" as const,
				title: "Hoteling",
				when,
				timeLabel,
				location: uniqueLocations.join(", "),
				href:
					linkSource.sharePointEventWebLink ||
					linkSource.outlookEventWebLink ||
					hotelingFallbackLink,
				meta: "Reservation",
			} as CalendarItem;
		})
		.filter(Boolean) as CalendarItem[];
}

type CalCallback = (opts?: { includeOutlook?: boolean }) => Promise<void>;
type CalOutput = {
	items: CalendarItem[];
	loading: boolean;
	load: CalCallback;
};

export function useCalendarData(
	ctx: WebPartContext,
	sites: string[],
): CalOutput {
	const [items, setItems] = React.useState<CalendarItem[]>([]);
	const [loading, setLoading] = React.useState(false);
	const me = currentUserEmail(ctx);
	const [includeOutlook, setIncludeOutlook] = React.useState<boolean>(false);

	const load: CalCallback = React.useCallback(
		async (opts?: { includeOutlook?: boolean }) => {
			setIncludeOutlook(!!opts?.includeOutlook);
			setLoading(true);
			try {
				const pnp = new PNPWrapper(ctx, {
					siteUrls: sites,
					cache: "true", // "true" = 1st call is cached (Utils.loadCachedThenFresh(...))
				});
				const assignmentsApi = new AssignmentsApi(pnp);
				const eventsApi = new EventsApi(pnp);

				const [assigns, events] = await Promise.all([
					assignmentsApi.get(200), // all sites (auto strategy)
					opts?.includeOutlook
						? eventsApi.getCombinedEvents(ctx, {
								includeOutlook: true,
							})
						: eventsApi.get(200),
				]);

				const calA = mapAssignmentsToCal(assigns || [], me);
				const calE = mapEventsToCal(events || []);
				const calH = mapHotelingToCal();
				const merged = [...calA, ...calE, ...calH].sort(
					(a, b) => a.when.getTime() - b.when.getTime(),
				);

				setItems(merged);
			} finally {
				setLoading(false);
			}
		},
		[ctx, sites, me],
	);

	React.useEffect(() => {
		const onHotelingUpdate = (): void => {
			load({ includeOutlook }).catch((error) => {
				console.warn(
					"Failed to refresh calendar after hoteling update.",
					error,
				);
			});
		};

		window.addEventListener(HOTELING_SYNC_EVENT, onHotelingUpdate);
		return () => {
			window.removeEventListener(HOTELING_SYNC_EVENT, onHotelingUpdate);
		};
	}, [load, includeOutlook]);

	return { items, loading, load };
}
