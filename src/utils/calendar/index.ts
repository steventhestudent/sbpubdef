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
};

export type CalendarItem = {
	id: string;
	kind: "assignment" | "event";
	title: string;
	when: Date;
	timeLabel: string;
	location?: string;
	href?: string;
	meta?: string;
};

export function toDateSafe(val?: string): Date | undefined {
	if (!val) return undefined;
	const d = new Date(val);
	return isNaN(d.getTime()) ? undefined : d;
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
