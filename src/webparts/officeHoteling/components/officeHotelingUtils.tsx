export interface Reservation {
	id: string;
	location: string;
	date: string;
	time: "Morning" | "Afternoon";
	desk?: string;
	outlookEventId?: string;
	outlookEventWebLink?: string;
	sharePointEventId?: number;
	sharePointListItemId?: number;
	sharePointEventWebLink?: string;
}

export interface TimeSlot {
	day: string;
	date: string;
	morning: boolean;
	afternoon: boolean;
	isHoliday?: boolean;
	isPast?: boolean;
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
	location: string;
	station?: string;
	timeLabel: "Morning" | "Afternoon" | "All Day";
}

export interface EmailAttachment {
	"@odata.type": "#microsoft.graph.fileAttachment";
	name: string;
	contentType: string;
	contentBytes: string;
	isInline?: boolean;
	contentId?: string;
}

export const LOCATION_DESK_OPTIONS: Record<string, string[]> = {
	"North County": [
		"Station 1",
		"Station 2",
		"Station 3",
		"Station 4",
		"Station 5",
	],
	"South County": [
		"First Floor - Station 1",
		"First Floor - Station 2",
		"Second Floor - Station 1",
		"Second Floor - Station 2",
		"Third Floor - Station 1",
		"Third Floor - Station 2",
		"Third Floor - Station 3",
	],
	Juvenile: ["Station 1", "Station 2"],
	Lompoc: ["Station 1", "Station 2", "Station 3"],
};

export const OFFICE_LOCATIONS = Object.keys(LOCATION_DESK_OPTIONS);
export const REMINDER_COOLDOWN_SECONDS = 10;

const PUBLIC_HOLIDAYS = new Set<string>([
	"2026-01-01",
	"2026-01-19",
	"2026-02-16",
	"2026-05-25",
	"2026-06-19",
	"2026-07-04",
	"2026-09-07",
	"2026-11-26",
	"2026-12-25",
]);

export const getMondayOfWeek = (date: Date): Date => {
	const monday = new Date(date);
	monday.setHours(0, 0, 0, 0);
	const day = monday.getDay();
	const diffToMonday = day === 0 ? -6 : 1 - day;
	monday.setDate(monday.getDate() + diffToMonday);
	return monday;
};

export const generateTimeSlots = (
	startDate: Date,
	bookedSlots: Set<string>,
): TimeSlot[] => {
	const slots: TimeSlot[] = [];
	const current = new Date(startDate);
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	for (let i = 0; i < 5; i++) {
		const year = current.getFullYear();
		const month = String(current.getMonth() + 1).padStart(2, "0");
		const day = String(current.getDate()).padStart(2, "0");
		const dateStr = `${year}-${month}-${day}`;

		const dayName = current.toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
		});

		const isHoliday = PUBLIC_HOLIDAYS.has(dateStr);
		const isPast = current < today;
		const morningKey = `${dateStr}-morning`;
		const afternoonKey = `${dateStr}-afternoon`;

		slots.push({
			day: dayName,
			date: dateStr,
			morning: !isHoliday && !isPast && !bookedSlots.has(morningKey),
			afternoon: !isHoliday && !isPast && !bookedSlots.has(afternoonKey),
			isHoliday,
			isPast,
		});
		current.setDate(current.getDate() + 1);
	}

	return slots;
};

export const getReservationDateTime = (reservation: Reservation): Date => {
	const [year, month, day] = reservation.date.split("-").map(Number);
	const hour = reservation.time === "Morning" ? 8 : 12;
	return new Date(year, month - 1, day, hour, 0, 0, 0);
};

export const getReservationDateRange = (
	reservation: Reservation,
): { start: Date; end: Date } => {
	const [year, month, day] = reservation.date.split("-").map(Number);
	const startHour = reservation.time === "Morning" ? 8 : 12;
	const endHour = reservation.time === "Morning" ? 12 : 17;
	return {
		start: new Date(year, month - 1, day, startHour, 0, 0, 0),
		end: new Date(year, month - 1, day, endHour, 0, 0, 0),
	};
};

export const canDeleteReservation = (reservation: Reservation): boolean => {
	const now = new Date();
	const reservationDateTime = getReservationDateTime(reservation);
	const hoursUntilReservation =
		(reservationDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
	return hoursUntilReservation >= 24;
};

export const formatReservationDate = (dateStr: string): string => {
	const [year, month, day] = dateStr.split("-").map(Number);
	const date = new Date(year, month - 1, day);
	return date.toLocaleDateString("en-US", {
		weekday: "short",
		month: "long",
		day: "numeric",
		year: "numeric",
	});
};

export const summarizeReservations = (
	reservationsToSummarize: Reservation[],
): ReservationSummaryGroup[] => {
	const groupedMap = new Map<string, Reservation[]>();

	reservationsToSummarize.forEach((reservation) => {
		const key = reservation.date;
		const current = groupedMap.get(key) ?? [];
		current.push(reservation);
		groupedMap.set(key, current);
	});

	return Array.from(groupedMap.entries())
		.map(([key, grouped]) => {
			const hasMorning = grouped.some((item) => item.time === "Morning");
			const hasAfternoon = grouped.some(
				(item) => item.time === "Afternoon",
			);
			const uniqueLocations = Array.from(
				new Set(grouped.map((item) => item.location)),
			);
			const uniqueStations = Array.from(
				new Set(
					grouped.map(
						(item) => `${item.location}: ${item.desk ?? "N/A"}`,
					),
				),
			);

			let timeLabel: ReservationSummaryGroup["timeLabel"] = "Morning";
			if (hasMorning && hasAfternoon) {
				timeLabel = "All Day";
			} else if (hasAfternoon) {
				timeLabel = "Afternoon";
			}

			const first = grouped[0];
			return {
				key,
				date: first.date,
				location: uniqueLocations.join(", "),
				station: uniqueStations.join(" | "),
				timeLabel,
			};
		})
		.sort((a, b) => a.date.localeCompare(b.date));
};

export const buildReservationSummaryEmailHtml = (
	summaryGroups: ReservationSummaryGroup[],
	uniqueLocations: string[],
	options?: {
		titleText?: string;
		introText?: string;
		downloadCalendarUrl?: string;
		downloadCalendarFileName?: string;
	},
): string => {
	const toGoogleDateTime = (date: Date): string => {
		const yyyy = date.getUTCFullYear();
		const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
		const dd = String(date.getUTCDate()).padStart(2, "0");
		const hh = String(date.getUTCHours()).padStart(2, "0");
		const min = String(date.getUTCMinutes()).padStart(2, "0");
		const ss = String(date.getUTCSeconds()).padStart(2, "0");
		return `${yyyy}${mm}${dd}T${hh}${min}${ss}Z`;
	};

	const encode = (value: string): string => encodeURIComponent(value);

	const buildOutlookAddToCalendarLink = (params: {
		subject: string;
		start: Date;
		end: Date;
		body: string;
		location?: string;
	}): string =>
		"https://outlook.office.com/calendar/0/deeplink/compose" +
		`?subject=${encode(params.subject)}` +
		`&startdt=${encode(params.start.toISOString())}` +
		`&enddt=${encode(params.end.toISOString())}` +
		`&body=${encode(params.body)}` +
		(params.location ? `&location=${encode(params.location)}` : "");

	const buildGoogleAddToCalendarLink = (params: {
		text: string;
		start: Date;
		end: Date;
		details: string;
		location?: string;
	}): string => {
		const dates = `${toGoogleDateTime(params.start)}/${toGoogleDateTime(params.end)}`;
		return (
			"https://calendar.google.com/calendar/render?action=TEMPLATE" +
			`&text=${encode(params.text)}` +
			`&dates=${encode(dates)}` +
			`&details=${encode(params.details)}` +
			(params.location ? `&location=${encode(params.location)}` : "")
		);
	};

	const formatEmailTimeLabel = (
		timeLabel: ReservationSummaryGroup["timeLabel"],
	): string => {
		switch (timeLabel) {
			case "Morning":
				return "8AM-12PM";
			case "Afternoon":
				return "1PM-5PM";
			case "All Day":
				return "8AM-5PM";
			default:
				return timeLabel;
		}
	};

	const titleText = options?.titleText ?? "Reservation Confirmed";
	const introText =
		options?.introText ?? "Your hoteling reservation has been confirmed.";
	const downloadCalendarUrl = options?.downloadCalendarUrl?.trim();
	const downloadCalendarFileName = options?.downloadCalendarFileName?.trim();
	const formatEmailStation = (station?: string): string =>
		(station ?? "N/A")
			.split(" | ")
			.map((entry) => entry.trim())
			.filter(Boolean)
			.join("<br />");

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
			end.setHours(12, 0, 0, 0);
		} else if (firstGroup.timeLabel === "Afternoon") {
			start.setHours(12, 0, 0, 0);
		}

		return { start, end };
	})();

	const locationsText = uniqueLocations.filter(Boolean).join(", ");
	const detailsText =
		summaryGroups
			.map((group) => {
				const dateNice = formatReservationDate(group.date);
				return `• ${dateNice} (${group.timeLabel}) — ${group.location} — ${group.station ?? ""}`.trim();
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

	const summaryRowsHtml = summaryGroups
		.map(
			(group) => `
				<tr>
					<td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;">${formatReservationDate(group.date)}</td>
					<td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;">${formatEmailTimeLabel(group.timeLabel)}</td>
					<td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;">${group.location}</td>
					<td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;">${formatEmailStation(group.station)}</td>
				</tr>
			`,
		)
		.join("");

	return `
		<div style="font-family: Segoe UI, Arial, sans-serif; color: #0f172a; background: #f8fafc; padding: 20px;">
			<div style="max-width: 760px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
				<div style="padding: 16px 18px; background: #eff6ff; border-bottom: 1px solid #dbeafe;">
					<div style="font-size: 18px; font-weight: 600; color: #1e3a8a;">${titleText}</div>
					<div style="margin-top: 6px; font-size: 14px; color: #334155;">${introText}</div>
				</div>

				<div style="padding: 14px 18px 6px 18px; font-size: 14px; color: #334155;">
					<div><strong>Total reservations:</strong> ${summaryGroups.length}</div>
					<div style="margin-top: 4px;"><strong>Locations:</strong> ${uniqueLocations.join(", ")}</div>
				</div>

				<div style="margin: 10px 18px 2px 18px; display: flex; gap: 10px; flex-wrap: wrap;">
					<a href="${outlookLink}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 10px 14px; border-radius: 8px; font-weight: 600;">Add to Outlook Calendar</a>
					<a href="${googleLink}" style="display: inline-block; background: #0f766e; color: #fff; text-decoration: none; padding: 10px 14px; border-radius: 8px; font-weight: 600;">Add to Google Calendar</a>
					${
						downloadCalendarUrl
							? `<a href="${downloadCalendarUrl}"${downloadCalendarFileName ? ` download="${downloadCalendarFileName}"` : ""} style="display: inline-block; background: #475569; color: #fff; text-decoration: none; padding: 10px 14px; border-radius: 8px; font-weight: 600;">Download Calendar</a>`
							: ""
					}
				</div>

				<div style="padding: 12px 18px 18px 18px;">
					<table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
						<thead>
							<tr style="background: #f1f5f9;">
								<th style="text-align: left; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase;">Date</th>
								<th style="text-align: left; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase;">Time</th>
								<th style="text-align: left; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase;">Location</th>
								<th style="text-align: left; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase;">Station</th>
							</tr>
						</thead>
						<tbody>
							${summaryRowsHtml}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	`;
};

export const buildReservationSummaryIcsAttachment = (
	summaryGroups: ReservationSummaryGroup[],
	uniqueLocations: string[],
	options?: { contentId?: string; isInline?: boolean },
): EmailAttachment | undefined => {
	if (summaryGroups.length === 0) {
		return undefined;
	}

	const toIcsUtc = (date: Date): string =>
		date
			.toISOString()
			.replace(/[-:]/g, "")
			.replace(/\.\d{3}Z$/, "Z");

	const escapeIcsText = (value: string): string =>
		value
			.replace(/\\/g, "\\\\")
			.replace(/;/g, "\\;")
			.replace(/,/g, "\\,")
			.replace(/\r\n|\r|\n/g, "\\n");

	const getRangeForGroup = (
		group: ReservationSummaryGroup,
	): { start: Date; end: Date } => {
		const [year, month, day] = group.date.split("-").map(Number);

		if (group.timeLabel === "Morning") {
			return {
				start: new Date(year, month - 1, day, 8, 0, 0, 0),
				end: new Date(year, month - 1, day, 12, 0, 0, 0),
			};
		}

		if (group.timeLabel === "Afternoon") {
			return {
				start: new Date(year, month - 1, day, 12, 0, 0, 0),
				end: new Date(year, month - 1, day, 17, 0, 0, 0),
			};
		}

		return {
			start: new Date(year, month - 1, day, 8, 0, 0, 0),
			end: new Date(year, month - 1, day, 17, 0, 0, 0),
		};
	};

	const toBase64Utf8 = (value: string): string => {
		const bytes = new TextEncoder().encode(value);
		let binary = "";
		bytes.forEach((byte) => {
			binary += String.fromCharCode(byte);
		});
		return btoa(binary);
	};

	const dtStamp = toIcsUtc(new Date());
	const locationText = uniqueLocations.filter(Boolean).join(", ");
	const eventTitle = `Office Hoteling: ${locationText || "Reservation"}`;

	const events = summaryGroups.map((group, index) => {
		const { start, end } = getRangeForGroup(group);
		const formattedDate = formatReservationDate(group.date);
		const stationText = group.station ? `\nStation: ${group.station}` : "";
		const description = `Hoteling reservation\nDate: ${formattedDate}\nTime: ${group.timeLabel}\nLocation: ${group.location}${stationText}`;
		const uid = `hoteling-${group.date}-${index}@sbpubdef`;

		return [
			"BEGIN:VEVENT",
			`UID:${escapeIcsText(uid)}`,
			`DTSTAMP:${dtStamp}`,
			`DTSTART:${toIcsUtc(start)}`,
			`DTEND:${toIcsUtc(end)}`,
			`SUMMARY:${escapeIcsText(eventTitle)}`,
			`LOCATION:${escapeIcsText(group.location)}`,
			`DESCRIPTION:${escapeIcsText(description)}`,
			"END:VEVENT",
		].join("\r\n");
	});

	const fileContent = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//sbpubdef//Office Hoteling//EN",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		...events,
		"END:VCALENDAR",
		"",
	].join("\r\n");

	const firstDate = summaryGroups[0]?.date ?? "";
	const [year, month, day] = firstDate.split("-").map(Number);
	const attachmentName =
		year && month && day
			? `Reservation ${month}-${day}-${year}.ics`
			: "Reservation.ics";

	return {
		"@odata.type": "#microsoft.graph.fileAttachment",
		name: attachmentName,
		contentType: "text/calendar",
		contentBytes: toBase64Utf8(fileContent),
		isInline: options?.isInline ?? false,
		contentId: options?.contentId,
	};
};
