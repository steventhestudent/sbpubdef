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

	const load: CalCallback = React.useCallback(
		async (opts?: { includeOutlook?: boolean }) => {
			setLoading(true);
			try {
				const pnp = new PNPWrapper(ctx, {
					siteUrls: sites,
					cache: "true",
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
				const merged = [...calA, ...calE].sort(
					(a, b) => a.when.getTime() - b.when.getTime(),
				);

				setItems(merged);
			} finally {
				setLoading(false);
			}
		},
		[ctx, sites, me],
	);

	return { items, loading, load };
}
