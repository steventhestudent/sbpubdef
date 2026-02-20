import * as React from "react";
import type { WebPartContext } from "@microsoft/sp-webpart-base";
import { PNPWrapper } from "@utils/PNPWrapper";
import { AssignmentsApi } from "@api/assignments";
import { EventsApi } from "@api/events/EventsApi";
import {
	CalendarItem,
	PDAssignment,
	PDEvent,
	toDateSafe,
	formatTime,
} from "./utils";
import {
	HOTELING_SYNC_EVENT,
	readHotelingReservations,
} from "../../utils/officeHotelingSync";

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
			const when = toDateSafe(e.date);
			if (!when) return undefined;
			return {
				id: `E-${e.id}`,
				kind: "event" as const,
				title: e.title,
				when,
				timeLabel: formatTime(when),
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

	return readHotelingReservations()
		.map((reservation) => {
			const [year, month, day] = reservation.date.split("-").map(Number);
			const hour = reservation.time === "Morning" ? 8 : 12;
			const when = new Date(year, month - 1, day, hour, 0, 0, 0);
			if (isNaN(when.getTime())) return undefined;

			return {
				id: `H-${reservation.id}`,
				kind: "event" as const,
				title: `Hoteling ${reservation.desk ? `(${reservation.desk})` : ""}`.trim(),
				when,
				timeLabel: reservation.time,
				location: reservation.location,
				href:
					reservation.sharePointEventWebLink ||
					reservation.outlookEventWebLink ||
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
			const includeOutlookValue = !!opts?.includeOutlook;
			setIncludeOutlook(includeOutlookValue);
			setLoading(true);
			try {
				const pnp = new PNPWrapper(ctx, {
					siteUrls: sites,
					cache: false,
				});
				const assignmentsApi = new AssignmentsApi(pnp);
				const eventsApi = new EventsApi(pnp);

				const [assigns, events] = await Promise.all([
					assignmentsApi.get(200), // all sites (auto strategy)
					includeOutlookValue
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
				console.warn("Failed to refresh calendar after hoteling update.", error);
			});
		};

		window.addEventListener(HOTELING_SYNC_EVENT, onHotelingUpdate);
		return () => {
			window.removeEventListener(HOTELING_SYNC_EVENT, onHotelingUpdate);
		};
	}, [load, includeOutlook]);

	return { items, loading, load };
}
