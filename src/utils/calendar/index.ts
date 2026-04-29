// Minimal shapes we rely on (adapt to your existing types)
export type PDAssignment = {
	id: number | string;
	title: string;
	nextHearing?: string; // ISO or parseable
	status?: string;
	link?: string;
	attorneyEmail?: string;
	isMyCase?: boolean; // if you already compute this upstream
};

export type PDEvent = {
	id: number | string;
	title: string;
	date?: string; // ISO or parseable
	location?: string;
	detailsUrl?: string;
	endDate?: string;
	allDay?: boolean;
	siteUrl?: string;
	PDDepartment?: string;
};

export type CalendarItem = {
	id: string;
	kind: "assignment" | "event";
	title: string;
	when: Date;
	timeLabel: string;
	location?: string;
	href?: string;
	source?: string;
	meta?: string;
};

export function toDateSafe(val?: string): Date | undefined {
	if (!val) return undefined;
	const d = new Date(val);
	return isNaN(d.getTime()) ? undefined : d;
}

/**
 * Leading YYYY-MM-DD from an ISO string as a **local** calendar date at noon.
 * SharePoint/Graph all-day events often use UTC midnight (`…T00:00:00Z`), which
 * becomes the previous calendar day in US time zones if parsed with `new Date(iso)`.
 */
export function parseDateOnlyLocal(isoOrDate?: string): Date | undefined {
	if (!isoOrDate) return undefined;
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoOrDate.trim());
	if (!m) return undefined;
	const y = Number(m[1]);
	const mo = Number(m[2]) - 1;
	const d = Number(m[3]);
	const dt = new Date(y, mo, d, 12, 0, 0, 0);
	return isNaN(dt.getTime()) ? undefined : dt;
}

/** Start instant for UI: all-day uses calendar date in local time; timed uses parsed ISO. */
export function getEventLocalStart(e: {
	date?: string;
	allDay?: boolean;
}): Date | undefined {
	if (!e.date) return undefined;
	if (e.allDay) {
		const localDay = parseDateOnlyLocal(e.date);
		if (localDay) return localDay;
	}
	return toDateSafe(e.date);
}

export function pad2(n: number): string {
	return n < 10 ? `0${n}` : String(n);
}

export function sameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

// Build a 6x7 matrix of Date objects covering the calendar view for (year, month)
export function buildMonthMatrix(year: number, month: number): Date[][] {
	// month is 0-based
	const firstOfMonth = new Date(year, month, 1);
	const start = new Date(firstOfMonth);
	const weekday = start.getDay(); // 0=Sun
	start.setDate(start.getDate() - weekday);

	const weeks: Date[][] = [];
	const cur = new Date(start);
	for (let w = 0; w < 6; w++) {
		const row: Date[] = [];
		for (let d = 0; d < 7; d++) {
			row.push(new Date(cur));
			cur.setDate(cur.getDate() + 1);
		}
		weeks.push(row);
	}
	return weeks;
}

export function formatTime(d?: Date): string {
	return d
		? d.toLocaleTimeString(undefined, {
				hour: "numeric",
				minute: "2-digit",
			})
		: "";
}

export function formatMonthYear(d: Date): string {
	return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export const findCellList: (
	tar: HTMLElement,
	level?: number,
) => HTMLElement | undefined = (tar, level = 0) => {
	if (tar.nodeName === "UL")
		return tar.classList.contains("overflow-hidden") ? tar : undefined;
	if (tar.nodeName === "LI")
		return tar.parentElement!.classList.contains("overflow-hidden")
			? tar.parentElement!
			: undefined;
	return level < 2 ? findCellList(tar.parentElement!, ++level) : undefined;
};

export const wheelHandler = (e: WheelEvent): void => {
	const cellListTarget = findCellList(e.target! as HTMLElement);
	if (!cellListTarget) return;
	e.preventDefault();
	cellListTarget.scrollTop += e.deltaY;
};
