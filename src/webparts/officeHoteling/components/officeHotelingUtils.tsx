import { offices } from "@webparts/officeInformation/components/Offices";

export type TimeOfDay = "Morning" | "Afternoon";

export interface Reservation {
	id: string;
	location: string;
	date: string; // YYYY-MM-DD
	time: TimeOfDay;
	desk?: string;

	// SharePoint HotelingReservations list item id
	spListItemId?: number;

	// calendar event tracking
	outlookEventId?: string;
	sharePointEventId?: number;
	sharePointEventWebLink?: string;
}

export interface TimeSlot {
	day: string;
	date: string; // YYYY-MM-DD
	morning: boolean;
	afternoon: boolean;
	isPast?: boolean;
	isHoliday?: boolean;
}

export interface StatusMessage {
	type: "success" | "error";
	text: string;
}

export interface ReservationGroup {
	key: string;
	date: string;
	location: string;
	desk?: string;
	reservations: Reservation[];
	timeLabel: "Morning" | "Afternoon" | "All Day";
}

export interface ReservationSummaryGroup {
	key: string;
	date: string;
	timeLabel: "Morning" | "Afternoon" | "All Day";
	location: string;
	station?: string;
}

export const OFFICE_LOCATIONS: string[] = (offices ?? []).map(
	(o) => o.name ?? String(o),
);

export const LOCATION_DESK_OPTIONS: Record<string, string[]> =
	OFFICE_LOCATIONS.reduce(
		(acc, loc) => {
			acc[loc] = ["Desk 1", "Desk 2", "Desk 3", "Desk 4"];
			return acc;
		},
		{} as Record<string, string[]>,
	);

export const REMINDER_COOLDOWN_SECONDS = 30;

//Monday of the week for a given date
export const getMondayOfWeek = (date: Date): Date => {
	const d = new Date(date);
	const day = d.getDay(); //
	const diff = (day === 0 ? -6 : 1) - day; // move to Monday
	d.setDate(d.getDate() + diff);
	d.setHours(0, 0, 0, 0);
	return d;
};

export const formatReservationDate = (dateStr: string): string => {
	const d = new Date(dateStr);
	return d.toLocaleDateString("en-US", {
		weekday: "short",
		month: "long",
		day: "numeric",
		year: "numeric",
	});
};

export const canDeleteReservation = (reservation: Reservation): boolean => {
	const start = new Date(reservation.date);
	if (reservation.time === "Morning") start.setHours(8, 0, 0, 0);
	else start.setHours(12, 0, 0, 0);

	const now = Date.now();
	const twentyFourHours = 24 * 60 * 60 * 1000;
	return now < start.getTime() - twentyFourHours;
};

export const getReservationDateRange = (
	reservation: Reservation,
): { start: Date; end: Date } => {
	const [year, month, day] = reservation.date.split("-").map(Number);
	// Treat Morning as 8am-12pm, Afternoon as 12pm-5pm
	const start = new Date(
		year,
		month - 1,
		day,
		reservation.time === "Morning" ? 8 : 12,
		0,
		0,
		0,
	);
	const end = new Date(
		year,
		month - 1,
		day,
		reservation.time === "Morning" ? 12 : 17,
		0,
		0,
		0,
	);
	return { start, end };
};

// Build time slots for the next 5
export const generateTimeSlots = (
	weekStartDate: Date,
	bookedSlots: Set<string>,
): TimeSlot[] => {
	const slots: TimeSlot[] = [];
	const current = new Date(weekStartDate);

	// generate 5 weekdays
	while (slots.length < 5) {
		const day = current.getDay();
		const isWeekend = day === 0 || day === 6;

		if (!isWeekend) {
			const dateStr = current.toISOString().split("T")[0];
			const label = current.toLocaleDateString("en-US", {
				weekday: "short",
				month: "numeric",
				day: "numeric",
				year: "2-digit",
			});

			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const temp = new Date(current);
			temp.setHours(0, 0, 0, 0);
			const isPast = temp < today;

			// not done
			const isHoliday = false;

			slots.push({
				day: label,
				date: dateStr,
				morning:
					!bookedSlots.has(`${dateStr}-morning`) &&
					!isPast &&
					!isHoliday,
				afternoon:
					!bookedSlots.has(`${dateStr}-afternoon`) &&
					!isPast &&
					!isHoliday,
				isPast,
				isHoliday,
			});
		}

		current.setDate(current.getDate() + 1);
	}

	return slots;
};

export const summarizeReservations = (
	reservations: Reservation[],
): ReservationSummaryGroup[] => {
	const sorted = [...reservations].sort(
		(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
	);

	const map = new Map<string, Reservation[]>();
	sorted.forEach((r) => {
		const key = r.date;
		const existing = map.get(key) ?? [];
		existing.push(r);
		map.set(key, existing);
	});

	return Array.from(map.entries()).map(([dateKey, group]) => {
		const hasMorning = group.some((r) => r.time === "Morning");
		const hasAfternoon = group.some((r) => r.time === "Afternoon");

		let timeLabel: "Morning" | "Afternoon" | "All Day" = "Morning";
		if (hasMorning && hasAfternoon) timeLabel = "All Day";
		else if (hasAfternoon) timeLabel = "Afternoon";

		const locations = Array.from(
			new Set(group.map((r) => r.location)),
		).join(", ");
		const stations = Array.from(
			new Set(
				group.map((r) => `${r.location}: ${r.desk ?? "Station N/A"}`),
			),
		).join(" | ");

		return {
			key: dateKey,
			date: dateKey,
			timeLabel,
			location: locations,
			station: stations,
		};
	});
};

// const pad2 = (n: number): string => String(n).padStart(2, "0");

//Google calendaf  wants YYYYMMDDTHHMMSSZ
const toGoogleDateTime = (d: Date): string => {
	const iso = d.toISOString(); // YYYY-MM-DDTHH:mm:ss.sssZ
	const [datePart, timePart] = iso.split("T");
	const time = timePart.replace(/:/g, "").split(".")[0]; // HHmmss
	const date = datePart.replace(/-/g, ""); // YYYYMMDD
	return `${date}T${time}Z`;
};

const encode = (s: string): string => encodeURIComponent(s);

// Generates Outlook web compose link
export const buildOutlookAddToCalendarLink = (opts: {
	subject: string;
	start: Date;
	end: Date;
	body: string;
	location?: string;
}): string => {
	return (
		"https://outlook.office.com/calendar/0/deeplink/compose" +
		`?subject=${encode(opts.subject)}` +
		`&startdt=${encode(opts.start.toISOString())}` +
		`&enddt=${encode(opts.end.toISOString())}` +
		`&body=${encode(opts.body)}` +
		(opts.location ? `&location=${encode(opts.location)}` : "")
	);
};

// Generates Google Calendar template link tutorial point?
export const buildGoogleAddToCalendarLink = (opts: {
	text: string;
	start: Date;
	end: Date;
	details: string;
	location?: string;
}): string => {
	const dates = `${toGoogleDateTime(opts.start)}/${toGoogleDateTime(opts.end)}`;
	return (
		"https://calendar.google.com/calendar/render?action=TEMPLATE" +
		`&text=${encode(opts.text)}` +
		`&dates=${encode(dates)}` +
		`&details=${encode(opts.details)}` +
		(opts.location ? `&location=${encode(opts.location)}` : "")
	);
};

//Builds the HTML email you send via your function.
//  includes "Add to Calendar" buttons for Outlook + Google.

export const buildReservationSummaryEmailHtml = (
	summaryGroups: ReservationSummaryGroup[],
	uniqueLocations: string[],
	options?: { titleText?: string; introText?: string },
): string => {
	const titleText = options?.titleText ?? "Reservation Confirmed";
	const introText =
		options?.introText ?? "Your hoteling reservation has been confirmed!";

	const firstGroup = summaryGroups[0];

	const startEnd = (() => {
		if (!firstGroup) {
			const now = new Date();
			const later = new Date(now);
			later.setHours(now.getHours() + 1);
			return { start: now, end: later };
		}
		const [year, month, day] = firstGroup.date.split("-").map(Number);
		const start = new Date(year, month - 1, day, 8, 0, 0, 0);
		const end = new Date(year, month - 1, day, 17, 0, 0, 0);
		if (firstGroup.timeLabel === "Morning") {
			start.setHours(8, 0, 0, 0);
			end.setHours(12, 0, 0, 0);
		} else if (firstGroup.timeLabel === "Afternoon") {
			start.setHours(12, 0, 0, 0);
			end.setHours(17, 0, 0, 0);
		}
		return { start, end };
	})();

	const locationsText = uniqueLocations.filter(Boolean).join(", ");
	const detailsText =
		summaryGroups
			.map((g) => {
				const dateNice = formatReservationDate(g.date);
				return `• ${dateNice} (${g.timeLabel}) — ${g.location} — ${g.station ?? ""}`.trim();
			})
			.join("\n") || "Reservation details unavailable.";

	const subject = `Office Hoteling: ${locationsText || "Reservation"}`;

	const outlookLink = buildOutlookAddToCalendarLink({
		subject,
		start: startEnd.start,
		end: startEnd.end,
		body: detailsText,
		location: locationsText,
	});

	const googleLink = buildGoogleAddToCalendarLink({
		text: subject,
		start: startEnd.start,
		end: startEnd.end,
		details: detailsText,
		location: locationsText,
	});

	const rowsHtml = summaryGroups
		.map((g) => {
			return `
        <tr>
          <td style="padding:10px;border:1px solid #e5e7eb;">
            <div style="font-weight:600;color:#0f172a;">${formatReservationDate(g.date)}</div>
            <div style="margin-top:4px;color:#334155;">${g.timeLabel}</div>
          </td>
          <td style="padding:10px;border:1px solid #e5e7eb;">
            <div style="font-weight:600;color:#0f172a;">${g.location}</div>
            <div style="margin-top:4px;color:#334155;">${g.station ?? "Station N/A"}</div>
          </td>
        </tr>
      `;
		})
		.join("");

	return `
  <div style="font-family:Segoe UI, Arial, sans-serif; color:#0f172a;">
    <h2 style="margin:0 0 8px 0;">${titleText}</h2>
    <p style="margin:0 0 16px 0; color:#334155;">${introText}</p>

    <div style="margin: 14px 0 18px 0; display:flex; gap:10px; flex-wrap:wrap;">
      <a href="${outlookLink}"
         style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600;">
        Add to Outlook Calendar
      </a>
      <a href="${googleLink}"
         style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600;">
        Add to Google Calendar
      </a>
    </div>

    <table style="border-collapse:collapse;width:100%;margin-top:10px;">
      <thead>
        <tr>
          <th style="text-align:left;background:#f1f5f9;padding:10px;border:1px solid #e5e7eb;">Date / Time</th>
          <th style="text-align:left;background:#f1f5f9;padding:10px;border:1px solid #e5e7eb;">Location / Station</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <p style="margin-top:16px;color:#64748b;font-size:12px;">
      If the buttons don’t work in your email client, open the email in a browser or copy/paste the links into your browser.
    </p>
  </div>
  `;
};
