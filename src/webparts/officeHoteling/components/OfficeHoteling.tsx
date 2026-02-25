import * as React from "react";
import type { IOfficeHotelingProps } from "./IOfficeHotelingProps";
import { GraphClient, MSGraphClientV3 } from "@utils/graph/GraphClient";
import {
	readHotelingReservations,
	writeHotelingReservations,
} from "@services/officeHotelingSync";
import { AadHttpClient } from "@microsoft/sp-http";
import { ISPFXContext, SPFx as spSPFx, spfi, SPFI } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";

interface Reservation {
	id: string;
	location: string;
	date: string;
	time: "Morning" | "Afternoon";
	desk?: string;
	outlookEventId?: string;
	outlookEventWebLink?: string;
	sharePointEventId?: number;
	sharePointEventWebLink?: string;
}

interface TimeSlot {
	day: string;
	date: string;
	morning: boolean;
	afternoon: boolean;
	isHoliday?: boolean;
	isPast?: boolean;
}

interface StatusMessage {
	type: "success" | "error";
	text: string;
}

interface ReservationGroup {
	key: string;
	date: string;
	location: string;
	desk?: string;
	reservations: Reservation[];
	timeLabel: "Morning" | "Afternoon" | "All Day";
}

interface ReservationSummaryGroup {
	key: string;
	date: string;
	location: string;
	station?: string;
	timeLabel: "Morning" | "Afternoon" | "All Day";
}

const LOCATION_DESK_OPTIONS: Record<string, string[]> = {
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

const OFFICE_LOCATIONS = Object.keys(LOCATION_DESK_OPTIONS);
const REMINDER_COOLDOWN_SECONDS = 10;

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

const getMondayOfWeek = (date: Date): Date => {
	const monday = new Date(date);
	monday.setHours(0, 0, 0, 0);
	const day = monday.getDay();
	const diffToMonday = day === 0 ? -6 : 1 - day;
	monday.setDate(monday.getDate() + diffToMonday);
	return monday;
};

const generateTimeSlots = (
	startDate: Date,
	bookedSlots: Set<string>,
	desk?: string,
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

export function OfficeHoteling(props: IOfficeHotelingProps): JSX.Element {
	const [selectedLocation, setSelectedLocation] = React.useState(
		OFFICE_LOCATIONS[0],
	);
	const [selectedDesk, setSelectedDesk] = React.useState<string>(
		LOCATION_DESK_OPTIONS[OFFICE_LOCATIONS[0]][0],
	);
	const [reservations, setReservations] = React.useState<Reservation[]>(() =>
		readHotelingReservations(),
	);
	const [editingReservationId, setEditingReservationId] = React.useState<
		string | null
	>(null);
	const [viewMode, setViewMode] = React.useState<"my" | "add">("my");
	const [showCalendar, setShowCalendar] = React.useState(false);
	const [weekStartDate, setWeekStartDate] = React.useState<Date>(() =>
		getMondayOfWeek(new Date()),
	);
	const [bookedSlots, setBookedSlots] = React.useState<Set<string>>(
		new Set(),
	);
	const [pendingReservation, setPendingReservation] =
		React.useState<Reservation | null>(null);
	const [pendingDeleteIds, setPendingDeleteIds] = React.useState<string[] | null>(null);
	const [showLimitModal, setShowLimitModal] = React.useState<boolean>(false);
	const [sendConfirmationToInbox, setSendConfirmationToInbox] =
		React.useState<boolean>(true);
	const [isProcessingConfirmation, setIsProcessingConfirmation] =
		React.useState<boolean>(false);
	const [statusMessage, setStatusMessage] =
		React.useState<StatusMessage | null>(null);
	const [pendingSelections, setPendingSelections] = React.useState<
		Reservation[]
	>([]);
	const [showPendingSelectionConfirmModal, setShowPendingSelectionConfirmModal] =
		React.useState<boolean>(false);
	const [reminderCooldownByReservationId, setReminderCooldownByReservationId] =
		React.useState<Record<string, number>>({});
	const [reminderWaitSeconds, setReminderWaitSeconds] = React.useState<number>(0);
	const [showReminderWaitModal, setShowReminderWaitModal] =
		React.useState<boolean>(false);
	const [openDropdown, setOpenDropdown] = React.useState<
		"location" | "station" | null
	>(null);
	const locationDropdownRef = React.useRef<HTMLDivElement | null>(null);
	const stationDropdownRef = React.useRef<HTMLDivElement | null>(null);

	React.useEffect(() => {
		const setSlots = new Set<string>();
		reservations.forEach((r) => {
			setSlots.add(`${r.date}-${r.time.toLowerCase()}`);
		});
		setBookedSlots(setSlots);
		writeHotelingReservations(reservations);
	}, [reservations]);

	React.useEffect(() => {
		if (!statusMessage) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			setStatusMessage(null);
		}, 6000);

		return () => window.clearTimeout(timeoutId);
	}, [statusMessage]);

	React.useEffect(() => {
		const locationDeskOptions = LOCATION_DESK_OPTIONS[selectedLocation] ?? [];
		if (locationDeskOptions.length === 0) {
			setSelectedDesk("");
			return;
		}

		if (!locationDeskOptions.includes(selectedDesk)) {
			setSelectedDesk(locationDeskOptions[0]);
		}
	}, [selectedLocation, selectedDesk]);

	React.useEffect(() => {
		const handleDocumentClick = (event: MouseEvent): void => {
			const target = event.target as Node;
			const clickedLocationDropdown =
				locationDropdownRef.current?.contains(target) ?? false;
			const clickedStationDropdown =
				stationDropdownRef.current?.contains(target) ?? false;

			if (!clickedLocationDropdown && !clickedStationDropdown) {
				setOpenDropdown(null);
			}
		};

		document.addEventListener("mousedown", handleDocumentClick);
		return () => document.removeEventListener("mousedown", handleDocumentClick);
	}, []);

	React.useEffect(() => {
		const hasActiveCooldown = Object.values(reminderCooldownByReservationId).some(
			(seconds) => seconds > 0,
		);
		if (!hasActiveCooldown) {
			return;
		}

		const intervalId = window.setInterval(() => {
			setReminderCooldownByReservationId((current) => {
				const nextEntries = Object.entries(current)
					.map(([reservationId, seconds]) => [
						reservationId,
						Math.max(0, seconds - 1),
					] as const)
					.filter(([, seconds]) => seconds > 0);

				return Object.fromEntries(nextEntries);
			});
		}, 1000);

		return () => window.clearInterval(intervalId);
	}, [reminderCooldownByReservationId]);

	const timeSlots = generateTimeSlots(
		weekStartDate,
		bookedSlots,
		selectedDesk,
	);

	const deskOptionsForSelectedLocation =
		LOCATION_DESK_OPTIONS[selectedLocation] ?? [];

	const dropdownButtonClassName =
		"w-full px-3 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between";
	const dropdownMenuClassName =
		"absolute z-30 mt-1 w-full border border-slate-300 rounded bg-white max-h-56 overflow-y-auto";
	const dropdownOptionClassName =
		"w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50";

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const minWeekStart = getMondayOfWeek(today);
	const maxDate = new Date(today);
	maxDate.setDate(maxDate.getDate() + 20);
	const maxWeekStart = getMondayOfWeek(maxDate);

	const getReservationDateTime = (reservation: Reservation): Date => {
		const [year, month, day] = reservation.date.split("-").map(Number);
		const hour = reservation.time === "Morning" ? 8 : 12;
		return new Date(year, month - 1, day, hour, 0, 0, 0);
	};

	const getReservationDateRange = (
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

	const canDeleteReservation = (reservation: Reservation): boolean => {
		const now = new Date();
		const reservationDateTime = getReservationDateTime(reservation);
		const hoursUntilReservation =
			(reservationDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
		return hoursUntilReservation >= 24;
	};

	const formatDate = (dateStr: string): string => {
		const [year, month, day] = dateStr.split("-").map(Number);
		const date = new Date(year, month - 1, day);
		return date.toLocaleDateString("en-US", {
			weekday: "short",
			month: "long",
			day: "numeric",
			year: "numeric",
		});
	};

	const SEND_EMAIL_FUNCTION_URL =
		"https://sbpubdef-agfwa0d9e3b9anch.westus3-01.azurewebsites.net/api/SendEmail";
	const SEND_EMAIL_API_APP_ID = "c852c7d6-8c34-4b51-a368-92be5f2ac96a";

	const sendEmailViaFunction = async (
		toEmails: string[],
		subject: string,
		body: string,
	): Promise<void> => {
		const client: AadHttpClient =
			await props.context.aadHttpClientFactory.getClient(
				SEND_EMAIL_API_APP_ID,
			);

		const payload = {
			to_email: toEmails,
			subject,
			body,
			content_type: "HTML",
		};

		const response = await client.post(
			SEND_EMAIL_FUNCTION_URL,
			AadHttpClient.configurations.v1,
			{
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			},
		);

		if (!response.ok) {
			const errText = await response.text().catch(() => "");
			throw new Error(
				`Failed to send email via function (${response.status}) ${errText}`,
			);
		}
	};

	const sendReservationEmail = async (
		reservation: Reservation,
		recipientEmail: string,
	): Promise<void> => {
		const relatedReservations = [
			...reservations.filter(
				(item) =>
					item.date === reservation.date &&
					item.location === reservation.location &&
					(item.desk ?? "") === (reservation.desk ?? ""),
			),
			reservation,
		].filter(
			(item, index, self) =>
				self.findIndex((candidate) => candidate.id === item.id) === index,
		);

		await sendReservationSummaryEmail(relatedReservations, recipientEmail, {
			titleText: "Reservation Confirmed",
			introText: "Your hoteling reservation has been confirmed.",
			subjectPrefix: "Reservation Confirmed",
		});
	};

	const summarizeReservations = (
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
				const hasAfternoon = grouped.some((item) => item.time === "Afternoon");
				const uniqueLocations = Array.from(
					new Set(grouped.map((item) => item.location)),
				);
				const uniqueStations = Array.from(
					new Set(
						grouped.map(
							(item) =>
								`${item.location}: ${item.desk ?? "N/A"}`,
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

	const buildReservationSummaryEmailHtml = (
		summaryGroups: ReservationSummaryGroup[],
		uniqueLocations: string[],
		options?: { titleText?: string; introText?: string },
	): string => {
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

		const summaryRowsHtml = summaryGroups
			.map(
				(group) => `
					<tr>
						<td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;">${formatDate(group.date)}</td>
						<td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;">${formatEmailTimeLabel(group.timeLabel)}</td>
						<td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;">${group.location}</td>
						<td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;">${group.station ?? "N/A"}</td>
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

	async function sendReservationSummaryEmail(
		reservationsToSummarize: Reservation[],
		recipientEmail: string,
		options?: {
			titleText?: string;
			introText?: string;
			subjectPrefix?: string;
			includeAllDayInSubject?: boolean;
		},
	): Promise<void> {
		const summaryGroups = summarizeReservations(reservationsToSummarize);
		const uniqueLocations = Array.from(
			new Set(summaryGroups.map((group) => group.location)),
		);
		const includesAllDay = summaryGroups.some(
			(group) => group.timeLabel === "All Day",
		);
		const subjectPrefix = options?.subjectPrefix ?? "Reservation Confirmed";
		const includeAllDayInSubject = options?.includeAllDayInSubject ?? false;

		const subject = includeAllDayInSubject && includesAllDay
			? `${subjectPrefix}: All Day`
			: subjectPrefix;

		const bodyHtml = buildReservationSummaryEmailHtml(
			summaryGroups,
			uniqueLocations,
			{
				titleText: options?.titleText,
				introText: options?.introText,
			},
		);

		await sendEmailViaFunction([recipientEmail], subject, bodyHtml);
	}

	const getSharePointClient = (): SPFI => {
		const contextSiteUrl = props.context?.pageContext?.web?.absoluteUrl;
		if (!contextSiteUrl) {
			throw new Error(
				"SharePoint context is unavailable. Unable to access Events list.",
			);
		}

		return spfi().using(spSPFx(props.context as unknown as ISPFXContext));
	};


	const createSharePointEventForReservation = async (
		reservation: Reservation,
		options?: { forceAllDayRange?: boolean },
	): Promise<{ itemId: number; webLink: string }> => {
		const sp = getSharePointClient();
		const list = sp.web.lists.getByTitle("Events");
		const listInfo: { Id: string } = await list.select("Id")();
		const listGuid = listInfo.Id;

		const allDayRange = (() => {
			const [year, month, day] = reservation.date.split("-").map(Number);
			return {
				start: new Date(year, month - 1, day, 8, 0, 0, 0),
				end: new Date(year, month - 1, day, 17, 0, 0, 0),
			};
		})();

		const { start, end } = options?.forceAllDayRange
			? allDayRange
			: getReservationDateRange(reservation);

		const titleSuffix = options?.forceAllDayRange
			? " - All Day (8:00 AM - 5:00 PM)"
			: "";
		const descriptionTime = options?.forceAllDayRange
			? "All Day (8:00 AM - 5:00 PM)"
			: reservation.time;

		const added: { Id: number } = await list.items.add({
			Title: `Office Hoteling: ${reservation.location}${reservation.desk ? ` (${reservation.desk})` : ""}${titleSuffix}`,
			EventDate: start.toISOString(),
			EndDate: end.toISOString(),
			Location: reservation.location,
			Description: `Hoteling reservation (${descriptionTime})${reservation.desk ? ` - ${reservation.desk}` : ""}`,
			fAllDayEvent: false,
		});

		const webLink = `${window.location.origin}/_layouts/15/Event.aspx?ListGuid=${listGuid}&ItemId=${added.Id}`;
		return { itemId: added.Id, webLink };
	};

	const deleteSharePointEventForReservation = async (
		reservation: Reservation,
	): Promise<void> => {
		const sharePointEventId = (() => {
			if (reservation.sharePointEventId) {
				return reservation.sharePointEventId;
			}

			const webLink = reservation.sharePointEventWebLink ?? "";
			const itemIdMatch = webLink.match(/[?&]ItemId=(\d+)/i);
			if (!itemIdMatch) {
				return undefined;
			}

			const parsedItemId = Number(itemIdMatch[1]);
			return Number.isFinite(parsedItemId) ? parsedItemId : undefined;
		})();

		if (!sharePointEventId) {
			return;
		}

		const sp = getSharePointClient();
		await sp.web.lists
			.getByTitle("Events")
			.items.getById(sharePointEventId)
			.delete();
	};

	const deleteReservationEventFromCalendar = async (
		reservation: Reservation,
	): Promise<void> => {
		if (!reservation.outlookEventId) {
			return;
		}

		const client: MSGraphClientV3 = await GraphClient(props.context);
		await client.api(`/me/events/${reservation.outlookEventId}`).delete();
	};

	const extractErrorMessage = (error: unknown): string => {
		if (!error) {
			return "Unknown error";
		}

		if (typeof error === "object" && error !== null) {
			const e = error as {
				message?: string;
				statusCode?: number;
				code?: string;
				body?: string;
				error?: { message?: string; code?: string };
			};

			const parts: string[] = [];
			if (e.statusCode) parts.push(`HTTP ${e.statusCode}`);
			if (e.code) parts.push(e.code);
			if (e.error?.code) parts.push(e.error.code);

			const detail = e.error?.message ?? e.message ?? e.body;
			if (detail) {
				parts.push(detail);
			}

			if (parts.length > 0) {
				return parts.join(" - ");
			}
		}

		return String(error);
	};

	const isValidEmail = (value: string): boolean => {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
	};

	const getConfirmationRecipientEmail = (): string => {
		const recipients = new Set<string>();
		if (sendConfirmationToInbox) {
			const inboxEmail = (
				props.context.pageContext.user.email ?? ""
			).trim();
			if (inboxEmail) {
				recipients.add(inboxEmail);
			}
		}

		return Array.from(recipients).join(",");
	};

	const runReservationFollowUps = async (
		reservation: Reservation,
	): Promise<string[]> => {
		const followUps: Array<{ label: string; task: Promise<void> }> = [];
		const recipientEmails = getConfirmationRecipientEmail()
			.split(",")
			.map((email) => email.trim())
			.filter(Boolean);

		if (recipientEmails.length === 0) {
			return [
				"Email confirmation failed: No recipient email address was provided.",
			];
		}
		for (const recipientEmail of recipientEmails) {
			if (!isValidEmail(recipientEmail)) {
				return [
					`Email confirmation failed: Recipient email format is invalid (${recipientEmail}).`,
				];
			}
			followUps.push({
				label: `Email confirmation (${recipientEmail})`,
				task: sendReservationEmail(reservation, recipientEmail),
			});
		}

		if (followUps.length === 0) {
			return [];
		}

		const results = await Promise.allSettled(followUps.map((f) => f.task));
		const failures: string[] = [];

		results.forEach((result, idx) => {
			if (result.status === "rejected") {
				const detail = `${followUps[idx].label} failed: ${extractErrorMessage(result.reason)}`;
				failures.push(detail);
				console.warn("A reservation follow-up action failed.", detail);
			}
		});

		return failures;
	};

	const runBatchReservationFollowUps = async (
		reservationsToSummarize: Reservation[],
	): Promise<string[]> => {
		const recipientEmails = getConfirmationRecipientEmail()
			.split(",")
			.map((email) => email.trim())
			.filter(Boolean);

		if (recipientEmails.length === 0) {
			return [
				"Email confirmation failed: No recipient email address was provided.",
			];
		}

		const followUps: Array<{ label: string; task: Promise<void> }> = [];
		for (const recipientEmail of recipientEmails) {
			if (!isValidEmail(recipientEmail)) {
				return [
					`Email confirmation failed: Recipient email format is invalid (${recipientEmail}).`,
				];
			}

			followUps.push({
				label: `Email confirmation (${recipientEmail})`,
				task: sendReservationSummaryEmail(
					reservationsToSummarize,
					recipientEmail,
				),
			});
		}

		const results = await Promise.allSettled(followUps.map((f) => f.task));
		const failures: string[] = [];

		results.forEach((result, idx) => {
			if (result.status === "rejected") {
				const detail = `${followUps[idx].label} failed: ${extractErrorMessage(result.reason)}`;
				failures.push(detail);
				console.warn("A reservation follow-up action failed.", detail);
			}
		});

		return failures;
	};

	const isDeleteAlreadyAppliedError = (error: unknown): boolean => {
		const detail = extractErrorMessage(error).toLowerCase();
		return (
			detail.includes("http 404") ||
			detail.includes("item does not exist") ||
			detail.includes("not found")
		);
	};

	const handleDelete = (reservationIds: string[]): void => {
		if (reservationIds.length === 0) {
			return;
		}

		const canDeleteAll = reservationIds.every((id) => {
			const reservation = reservations.find((r) => r.id === id);
			return !!reservation && canDeleteReservation(reservation);
		});

		if (!canDeleteAll) {
			return;
		}

		setPendingDeleteIds(reservationIds);
	};

	const handleConfirmDelete = (confirmed: boolean): void => {
		if (!confirmed || !pendingDeleteIds || pendingDeleteIds.length === 0) {
			setPendingDeleteIds(null);
			return;
		}

		const deletedReservations = reservations.filter((r) =>
			pendingDeleteIds.includes(r.id),
		);

		const processedOutlookEventIds = new Set<string>();
		const processedSharePointEventIds = new Set<number>();

		const getReservationSharePointEventId = (
			reservation: Reservation,
		): number | undefined => {
			if (reservation.sharePointEventId) {
				return reservation.sharePointEventId;
			}

			const webLink = reservation.sharePointEventWebLink ?? "";
			const itemIdMatch = webLink.match(/[?&]ItemId=(\d+)/i);
			if (!itemIdMatch) {
				return undefined;
			}

			const parsedItemId = Number(itemIdMatch[1]);
			return Number.isFinite(parsedItemId) ? parsedItemId : undefined;
		};

		deletedReservations.forEach((reservation) => {
			if (
				reservation.outlookEventId &&
				!processedOutlookEventIds.has(reservation.outlookEventId)
			) {
				processedOutlookEventIds.add(reservation.outlookEventId);
				deleteReservationEventFromCalendar(reservation).catch((error) => {
					if (isDeleteAlreadyAppliedError(error)) {
						return;
					}
					const detail = extractErrorMessage(error);
					setStatusMessage({
						type: "error",
						text: `Reservation deleted, but calendar event delete failed: ${detail}`,
					});
				});
			}

			const sharePointEventId =
				getReservationSharePointEventId(reservation);
			if (
				sharePointEventId &&
				!processedSharePointEventIds.has(sharePointEventId)
			) {
				processedSharePointEventIds.add(sharePointEventId);
				deleteSharePointEventForReservation(reservation).catch((error) => {
					if (isDeleteAlreadyAppliedError(error)) {
						return;
					}
					const detail = extractErrorMessage(error);
					setStatusMessage({
						type: "error",
						text: `Reservation deleted, but SharePoint event delete failed: ${detail}`,
					});
				});
			}
		});

		const newReservations = reservations.filter(
			(reservation) => !pendingDeleteIds.includes(reservation.id),
		);
		setReservations(newReservations);
		setPendingDeleteIds(null);
		setEditingReservationId(null);
		setShowCalendar(false);
		setViewMode("my");
	};

	const handleSendReminder = (reservationIds: string[]): void => {
		if (reservationIds.length === 0) {
			return;
		}

		const cooldownKey = reservationIds[0];
		const cooldownSeconds = reminderCooldownByReservationId[cooldownKey] ?? 0;
		if (cooldownSeconds > 0) {
			setReminderWaitSeconds(cooldownSeconds);
			setShowReminderWaitModal(true);
			return;
		}

		const reminderReservations = reservations.filter((reservation) =>
			reservationIds.includes(reservation.id),
		);
		if (reminderReservations.length === 0) {
			console.warn("Could not find reservation to send reminder.");
			return;
		}

		const userEmail = props.context.pageContext.user.email;
		if (!userEmail) {
			console.warn(
				"No signed-in user email found. Reminder email was not sent.",
			);
			return;
		}

		setReminderCooldownByReservationId((current) => ({
			...current,
			[cooldownKey]: REMINDER_COOLDOWN_SECONDS,
		}));

		const sendReminder = async (): Promise<void> => {
			try {
				await sendReservationSummaryEmail(reminderReservations, userEmail, {
					titleText: "Reservation Reminder",
					introText:
						"This is your reminder for an upcoming hoteling reservation.",
					subjectPrefix: "Hoteling Reminder",
					includeAllDayInSubject: true,
				});
				console.log("Reminder email sent.");
				setStatusMessage({
					type: "success",
					text: "Reminder email sent.",
				});
			} catch (e: unknown) {
				console.error("Failed to send reminder email (exception).", e);
				const errorMessage =
					e instanceof Error ? e.message : String(e);
				setStatusMessage({
					type: "error",
					text: `Failed to send reminder email. ${errorMessage}`,
				});
				setReminderCooldownByReservationId((current) => {
					const next = { ...current };
					delete next[cooldownKey];
					return next;
				});
			}
		};

		sendReminder().catch((error) => {
			const detail = extractErrorMessage(error);
			console.warn("Failed to send reminder email.", detail);
			setStatusMessage({
				type: "error",
				text: `Reminder email failed: ${detail}`,
			});
			setReminderCooldownByReservationId((current) => {
				const next = { ...current };
				delete next[cooldownKey];
				return next;
			});
		});
	};

	const handleSelectTimeSlot = (
		slot: TimeSlot,
		timeOfDay: "Morning" | "Afternoon",
	): void => {
		const newPending: Reservation = {
			id: editingReservationId
				? editingReservationId
				: `res-${Date.now()}`,
			location: selectedLocation,
			date: slot.date,
			time: timeOfDay,
			desk: selectedDesk,
		};

		if (!editingReservationId) {
			const existingSelectionIndex = pendingSelections.findIndex(
				(selection) =>
					selection.date === newPending.date &&
					selection.time === newPending.time,
			);

			if (existingSelectionIndex >= 0) {
				const existingSelection = pendingSelections[existingSelectionIndex];
				const isSamePlacement =
					existingSelection.location === newPending.location &&
					(existingSelection.desk ?? "") === (newPending.desk ?? "");

				if (!isSamePlacement) {
					setStatusMessage({
						type: "error",
						text: `Time already selected for ${existingSelection.location} (${existingSelection.desk ?? "Station N/A"}).`,
					});
					return;
				}

				setPendingSelections((current) =>
					current.filter((_, idx) => idx !== existingSelectionIndex),
				);
				return;
			}

			if (reservations.length + pendingSelections.length >= 3) {
				setShowLimitModal(true);
				return;
			}

			setPendingSelections((current) => [...current, newPending]);
			setSendConfirmationToInbox(true);
			return;
		}

		setSendConfirmationToInbox(true);
		setPendingReservation(newPending);
	};

	const isPendingSelection = (
		date: string,
		timeOfDay: "Morning" | "Afternoon",
	): boolean =>
		pendingSelections.some(
			(selection) =>
				selection.date === date &&
				selection.time === timeOfDay,
		);

	const handleConfirmReservation = async (
		confirmed: boolean,
	): Promise<void> => {
		if (!confirmed) {
			setPendingReservation(null);
			return;
		}

		if (!pendingReservation) {
			return;
		}

		setIsProcessingConfirmation(true);
		try {
			if (editingReservationId) {
				const oldReservation = reservations.find(
					(r) => r.id === editingReservationId,
				);
				if (oldReservation) {
					const oldSlotKey = `${oldReservation.date}-${oldReservation.time.toLowerCase()}`;
					const newBookedSlots = new Set(bookedSlots);
					newBookedSlots.delete(oldSlotKey);
					newBookedSlots.add(
						`${pendingReservation.date}-${pendingReservation.time.toLowerCase()}`,
					);
					setBookedSlots(newBookedSlots);

					const newReservations = reservations.map((r) =>
						r.id === editingReservationId
							? {
									...r,
									location: pendingReservation.location,
									date: pendingReservation.date,
									time: pendingReservation.time,
									desk: pendingReservation.desk,
								}
							: r,
					);
					setReservations(newReservations);
				}
			} else {
				if (reservations.length >= 3) {
					setShowLimitModal(true);
					setPendingReservation(null);
					return;
				}

				const reservationToSave: Reservation = {
					...pendingReservation,
				};
				let updatedExistingReservations = reservations;
				const extraFailures: string[] = [];

				const pairedReservation = reservations.find(
					(reservation) =>
						reservation.date === pendingReservation.date &&
						reservation.location === pendingReservation.location &&
						(reservation.desk ?? "") ===
							(pendingReservation.desk ?? "") &&
						reservation.time !== pendingReservation.time,
				);

				if (pairedReservation) {
					if (
						pairedReservation.sharePointEventId ||
						pairedReservation.sharePointEventWebLink
					) {
						try {
							await deleteSharePointEventForReservation(pairedReservation);
						} catch (error) {
							extraFailures.push(
								`Delete existing event failed: ${extractErrorMessage(error)}`,
							);
						}
					}

					try {
						const createdAllDayEvent =
							await createSharePointEventForReservation(
								pendingReservation,
								{ forceAllDayRange: true },
							);

						reservationToSave.sharePointEventId = createdAllDayEvent.itemId;
						reservationToSave.sharePointEventWebLink =
							createdAllDayEvent.webLink;

						updatedExistingReservations = reservations.map((reservation) =>
							reservation.id === pairedReservation.id
								? {
										...reservation,
										sharePointEventId: createdAllDayEvent.itemId,
										sharePointEventWebLink:
											createdAllDayEvent.webLink,
								}
								: reservation,
						);
					} catch (error) {
						extraFailures.push(
							`All day event failed: ${extractErrorMessage(error)}`,
						);
					}
				} else {
					try {
						const createdSharePointEvent =
							await createSharePointEventForReservation(
								pendingReservation,
							);
						reservationToSave.sharePointEventId =
							createdSharePointEvent.itemId;
						reservationToSave.sharePointEventWebLink =
							createdSharePointEvent.webLink;
					} catch (error) {
						extraFailures.push(
							`SharePoint event failed: ${extractErrorMessage(error)}`,
						);
					}
				}

				const newBookedSlots = new Set(bookedSlots);
				newBookedSlots.add(
					`${pendingReservation.date}-${pendingReservation.time.toLowerCase()}`,
				);
				setBookedSlots(newBookedSlots);
				setReservations([...updatedExistingReservations, reservationToSave]);
				const followUpFailures =
					await runReservationFollowUps(pendingReservation);
				const allFailures = [...extraFailures, ...followUpFailures];
				if (allFailures.length > 0) {
					setStatusMessage({
						type: "error",
						text: `Reservation saved. ${allFailures.join(" | ")}`,
					});
				} else {
					setStatusMessage({
						type: "success",
						text: "Reservation saved and follow-up actions completed.",
					});
				}
			}
		} finally {
			setIsProcessingConfirmation(false);
			setPendingReservation(null);
			setPendingSelections([]);
			setEditingReservationId(null);
			setShowCalendar(false);
			setViewMode("my");
		}
	};

	const onConfirmReservation = (confirmed: boolean): void => {
		handleConfirmReservation(confirmed).catch((error) => {
			console.warn("Failed to confirm reservation.", error);
		});
	};

	const handleConfirmSelectedReservations = async (
		confirmed: boolean,
	): Promise<void> => {
		if (!confirmed) {
			setShowPendingSelectionConfirmModal(false);
			return;
		}

		if (pendingSelections.length === 0) {
			setShowPendingSelectionConfirmModal(false);
			return;
		}

		setIsProcessingConfirmation(true);
		try {
			let workingReservations = [...reservations];
			const newBookedSlots = new Set(bookedSlots);
			const extraFailures: string[] = [];
			const savedReservations: Reservation[] = [];

			for (const pendingSelection of pendingSelections) {
				if (workingReservations.length >= 3) {
					extraFailures.push(
						"Reservation limit reached while saving selected time slots.",
					);
					break;
				}

				const reservationToSave: Reservation = {
					...pendingSelection,
				};

				const pairedReservation = workingReservations.find(
					(reservation) =>
						reservation.date === pendingSelection.date &&
						reservation.location === pendingSelection.location &&
						(reservation.desk ?? "") ===
							(pendingSelection.desk ?? "") &&
						reservation.time !== pendingSelection.time,
				);

				if (pairedReservation) {
					if (
						pairedReservation.sharePointEventId ||
						pairedReservation.sharePointEventWebLink
					) {
						try {
							await deleteSharePointEventForReservation(pairedReservation);
						} catch (error) {
							extraFailures.push(
								`Delete existing event failed: ${extractErrorMessage(error)}`,
							);
						}
					}

					try {
						const createdAllDayEvent =
							await createSharePointEventForReservation(
								pendingSelection,
								{ forceAllDayRange: true },
							);

						reservationToSave.sharePointEventId = createdAllDayEvent.itemId;
						reservationToSave.sharePointEventWebLink =
							createdAllDayEvent.webLink;

						workingReservations = workingReservations.map((reservation) =>
							reservation.id === pairedReservation.id
								? {
										...reservation,
										sharePointEventId: createdAllDayEvent.itemId,
										sharePointEventWebLink:
											createdAllDayEvent.webLink,
								}
								: reservation,
						);
					} catch (error) {
						extraFailures.push(
							`All day event failed: ${extractErrorMessage(error)}`,
						);
					}
				} else {
					try {
						const createdSharePointEvent =
							await createSharePointEventForReservation(
								pendingSelection,
							);
						reservationToSave.sharePointEventId =
							createdSharePointEvent.itemId;
						reservationToSave.sharePointEventWebLink =
							createdSharePointEvent.webLink;
					} catch (error) {
						extraFailures.push(
							`SharePoint event failed: ${extractErrorMessage(error)}`,
						);
					}
				}

				newBookedSlots.add(
					`${pendingSelection.date}-${pendingSelection.time.toLowerCase()}`,
				);
				workingReservations = [...workingReservations, reservationToSave];
				savedReservations.push(reservationToSave);
			}

			setBookedSlots(newBookedSlots);
			setReservations(workingReservations);

			const followUpFailures =
				savedReservations.length > 0
					? await runBatchReservationFollowUps(savedReservations)
					: [];
			const allFailures = [...extraFailures, ...followUpFailures];

			if (allFailures.length > 0) {
				setStatusMessage({
					type: "error",
					text: `Reservation saved. ${allFailures.join(" | ")}`,
				});
			} else {
				setStatusMessage({
					type: "success",
					text: "Reservation saved and follow-up actions completed.",
				});
			}
		} finally {
			setIsProcessingConfirmation(false);
			setShowPendingSelectionConfirmModal(false);
			setPendingSelections([]);
			setEditingReservationId(null);
			setShowCalendar(false);
			setViewMode("my");
		}
	};

	const handlePreviousWeek = (): void => {
		const prev = new Date(weekStartDate);
		prev.setDate(prev.getDate() - 7);
		if (prev >= minWeekStart) {
			setWeekStartDate(prev);
		}
	};

	const handleNextWeek = (): void => {
		const next = new Date(weekStartDate);
		next.setDate(next.getDate() + 7);
		if (next <= maxWeekStart) {
			setWeekStartDate(next);
		}
	};

	const sortedReservations = [...reservations].sort(
		(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
	);

	const groupedReservations = React.useMemo<ReservationGroup[]>(() => {
		const groupedMap = new Map<string, Reservation[]>();

		sortedReservations.forEach((reservation) => {
			const groupKey = reservation.date;
			const existing = groupedMap.get(groupKey) ?? [];
			existing.push(reservation);
			groupedMap.set(groupKey, existing);
		});

		return Array.from(groupedMap.entries()).map(([key, group]) => {
			const hasMorning = group.some((reservation) => reservation.time === "Morning");
			const hasAfternoon = group.some((reservation) => reservation.time === "Afternoon");
			const uniqueLocations = Array.from(
				new Set(group.map((reservation) => reservation.location)),
			);
			const uniqueStations = Array.from(
				new Set(
					group.map(
						(reservation) =>
							`${reservation.location}: ${reservation.desk ?? "N/A"}`,
					),
				),
			);

			let timeLabel: "Morning" | "Afternoon" | "All Day" = "Morning";
			if (hasMorning && hasAfternoon) {
				timeLabel = "All Day";
			} else if (hasAfternoon) {
				timeLabel = "Afternoon";
			}

			const first = group[0];
			return {
				key,
				date: first.date,
				location: uniqueLocations.join(", "),
				desk: uniqueStations.join(" | "),
				reservations: group,
				timeLabel,
			};
		});
	}, [sortedReservations]);

	return (
		<section className="border border-[var(--webpart-border-color)] bg-[var(--webpart-bg-color)] shadow-sm p-6">
			<h2 className="text-xl font-semibold text-slate-800 mb-4">
				Hoteling
			</h2>
			{statusMessage && (
				<div
					className={`mb-4 rounded border px-3 py-2 text-sm ${
						statusMessage.type === "success"
							? "border-green-300 bg-green-50 text-green-800"
							: "border-red-300 bg-red-50 text-red-800"
					}`}
				>
					{statusMessage.text}
				</div>
			)}

			<div className="mb-4 flex gap-3">
				<button
					type="button"
					className={`px-3 py-2 border border-slate-300 rounded text-sm font-medium transition-colors ${
						viewMode === "my"
							? "bg-blue-600 text-white"
							: "bg-white text-slate-700 hover:bg-slate-50"
					}`}
					onClick={(e) => {
						e.stopPropagation();
						setViewMode("my");
						setShowCalendar(false);
						setPendingSelections([]);
					}}
				>
					My Reservations
				</button>
				<button
					type="button"
					className={`px-3 py-2 border border-slate-300 rounded text-sm font-medium transition-colors ${
						viewMode === "add"
							? "bg-blue-600 text-white"
							: "bg-white text-slate-700 hover:bg-slate-50"
					}`}
					onClick={(e) => {
						e.stopPropagation();
						setViewMode("add");
						setShowCalendar(true);
						setEditingReservationId(null);
					}}
				>
					Add Reservation
				</button>
			</div>

			{viewMode === "my" && (
				<div className="mb-6">
					<h3 className="font-semibold text-slate-800 mb-3">
						My Reservations ({groupedReservations.length})
					</h3>
					{groupedReservations.length === 0 && (
						<p className="text-sm text-slate-600">
							You currently have no reservation.
						</p>
					)}
					<div className="flex flex-wrap justify-start gap-3">
						{groupedReservations.map((group) => {
							const canDeleteGroup = group.reservations.every((reservation) =>
								canDeleteReservation(reservation),
							);

							return (
								<div
									key={group.key}
									className="border border-slate-300 rounded-lg p-3 bg-white w-full md:w-[calc(50%-0.375rem)] xl:w-[calc(33.333%-0.5rem)]"
								>
									<div className="mb-3">
										<p className="text-slate-800 font-medium text-sm">
											{formatDate(group.date)}
										</p>
										<p className="text-slate-600 text-sm mt-1">
											{group.timeLabel} — {group.desk ?? "Desk N/A"}
										</p>
										<p className="text-slate-700 text-sm mt-1">
											{group.location}
										</p>
									</div>

									<div className="flex flex-col items-start gap-2">
										<button
											type="button"
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												handleDelete(group.reservations.map((reservation) => reservation.id));
											}}
											disabled={!canDeleteGroup}
											className="px-2 py-1 text-xs font-medium border border-red-300 rounded text-red-700 bg-red-50 hover:bg-red-100 disabled:border-slate-200 disabled:text-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed"
										>
											Delete reservation
										</button>

										{!canDeleteGroup && (
											<p className="text-[11px] text-slate-500">
												Delete is disabled within 24 hours of the reservation.
											</p>
										)}

										<button
											type="button"
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												handleSendReminder(group.reservations.map((reservation) => reservation.id));
											}}
											className="px-2 py-1 text-xs font-medium border border-blue-300 rounded text-blue-700 bg-blue-50 hover:bg-blue-100"
										>
											{(reminderCooldownByReservationId[group.reservations[0].id] ?? 0) > 0
												? `Send reservation reminder (${reminderCooldownByReservationId[group.reservations[0].id]}s)`
												: "Send reservation reminder"}
										</button>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{viewMode === "add" && showCalendar && (
				<div className="border border-slate-300 rounded-lg p-4">
					<div className="mb-4">
						<div className="mb-4">
							<h3 className="font-semibold text-slate-800 mb-3">
								{editingReservationId
									? "Edit Reservation"
									: "Add a New Reservation"}
							</h3>
							{!editingReservationId && (
								<div className="mb-4 flex items-center justify-between gap-4">
									<div className="w-1/2">
										<label className="block text-sm font-medium text-slate-700 mb-2">
											Select location
										</label>
										<div className="relative" ref={locationDropdownRef}>
											<button
												type="button"
												onClick={() =>
													setOpenDropdown((current) =>
														current === "location" ? null : "location",
													)
												}
												className={dropdownButtonClassName}
											>
												<span>{selectedLocation}</span>
												<span className="text-slate-500">▾</span>
											</button>

											{openDropdown === "location" && (
												<div className={dropdownMenuClassName}>
													{OFFICE_LOCATIONS.map((location) => (
														<button
															key={location}
															type="button"
															onClick={() => {
																setSelectedLocation(location);
																setOpenDropdown(null);
															}}
															className={`${dropdownOptionClassName} ${selectedLocation === location ? "bg-slate-100" : ""}`}
														>
															{location}
														</button>
													))}
												</div>
											)}
										</div>
									</div>
									<div className="w-1/2 flex justify-end">
										<div className="w-3/4">
											<label className="block text-sm font-medium text-slate-700 mb-2 text-right">
													Select Station
											</label>
											<div className="relative" ref={stationDropdownRef}>
												<button
													type="button"
													onClick={() =>
														setOpenDropdown((current) =>
															current === "station" ? null : "station",
														)
													}
													className={dropdownButtonClassName}
												>
													<span>{selectedDesk || "Select Station"}</span>
													<span className="text-slate-500">▾</span>
												</button>

												{openDropdown === "station" && (
													<div className={dropdownMenuClassName}>
														{deskOptionsForSelectedLocation.map((deskOption) => (
															<button
																key={deskOption}
																type="button"
																onClick={() => {
																	setSelectedDesk(deskOption);
																	setOpenDropdown(null);
																}}
																className={`${dropdownOptionClassName} ${selectedDesk === deskOption ? "bg-slate-100" : ""}`}
															>
																{deskOption}
															</button>
														))}
													</div>
												)}
											</div>
										</div>
									</div>
								</div>
							)}
						</div>
						<div className="flex items-center justify-between mb-4">
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									handlePreviousWeek();
								}}
								className="px-3 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50"
							>
								← Previous Week
							</button>
							<h3 className="font-semibold text-slate-800">
								{editingReservationId ? "Edit for " : ""}
								{selectedLocation}
							</h3>
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									handleNextWeek();
								}}
								className="px-3 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50"
							>
								Next Week →
							</button>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full border-collapse table-fixed">
								<thead>
									<tr>
										<th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
											Time Slot
										</th>
										{timeSlots.map((slot) => (
											<th
												key={slot.date}
												className="border border-slate-300 bg-slate-100 px-2 py-1 text-center text-slate-700"
											>
												<div className="text-xs font-semibold uppercase tracking-wide">
													{slot.day.split(",")[0]}
												</div>
												<div className="text-xs text-slate-500">
													{slot.day
														.split(",")[1]
														?.trim() ?? ""}
												</div>
												{slot.isHoliday && (
													<div className="mt-1 text-[10px] text-red-600">
														Holiday
													</div>
												)}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									<tr>
										<td className="border border-slate-300 bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-700">
											Morning (8am-12pm)
										</td>
										{timeSlots.map((slot) => (
											<td
												key={`${slot.date}-morning`}
												className="border border-slate-300 p-2"
											>
												{(() => {
													const selected = isPendingSelection(
														slot.date,
														"Morning",
													);
													return (
												<button
													type="button"
													onClick={(e) => {
														e.preventDefault();
														e.stopPropagation();
														handleSelectTimeSlot(
															slot,
															"Morning",
														);
													}}
													disabled={!slot.morning}
													className={`w-full px-2 py-1.5 rounded text-xs font-medium transition-colors ${slot.isHoliday || slot.isPast ? "bg-slate-200 text-slate-500 cursor-not-allowed" : selected ? "bg-blue-200 hover:bg-blue-300 cursor-pointer" : slot.morning ? "bg-green-200 hover:bg-green-300 cursor-pointer" : "bg-pink-200 cursor-not-allowed opacity-50"}`}
												>
													{selected
														? "Selected"
														: slot.isHoliday
														? "Holiday"
														: slot.isPast
															? "Past"
															: slot.morning
																? "Available"
																: "Booked"}
												</button>
													);
												})()}
											</td>
										))}
									</tr>
									<tr>
										<td className="border border-slate-300 bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-700">
											Afternoon (12pm-5pm)
										</td>
										{timeSlots.map((slot) => (
											<td
												key={`${slot.date}-afternoon`}
												className="border border-slate-300 p-2"
											>
												{(() => {
													const selected = isPendingSelection(
														slot.date,
														"Afternoon",
													);
													return (
												<button
													type="button"
													onClick={(e) => {
														e.preventDefault();
														e.stopPropagation();
														handleSelectTimeSlot(
															slot,
															"Afternoon",
														);
													}}
													disabled={!slot.afternoon}
													className={`w-full px-2 py-1.5 rounded text-xs font-medium transition-colors ${slot.isHoliday || slot.isPast ? "bg-slate-200 text-slate-500 cursor-not-allowed" : selected ? "bg-blue-200 hover:bg-blue-300 cursor-pointer" : slot.afternoon ? "bg-green-200 hover:bg-green-300 cursor-pointer" : "bg-pink-200 cursor-not-allowed opacity-50"}`}
												>
													{selected
														? "Selected"
														: slot.isHoliday
														? "Holiday"
														: slot.isPast
															? "Past"
															: slot.afternoon
																? "Available"
																: "Booked"}
												</button>
													);
												})()}
											</td>
										))}
									</tr>
								</tbody>
							</table>
						</div>
					</div>
					<div className="flex items-center justify-between mt-4">
						{!pendingReservation && (
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									setShowCalendar(false);
									setPendingSelections([]);
									setEditingReservationId(null);
									setViewMode("my");
								}}
								className="px-4 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50"
							>
								Back
							</button>
						)}
						{!editingReservationId && (
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									setShowPendingSelectionConfirmModal(true);
								}}
								disabled={pendingSelections.length === 0}
								className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
							>
								Confirm
							</button>
						)}
					</div>
				</div>
			)}

			{pendingReservation && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
					<div className="bg-white rounded-md p-6 w-[90%] max-w-xl">
						<h4 className="font-semibold mb-3">
							Confirm Reservation
						</h4>
						<p className="mb-2">
							Location: <b>{pendingReservation.location}</b>
						</p>
						<p className="mb-2">
							Desk: <b>{pendingReservation.desk}</b>
						</p>
						<p className="mb-2">
							Date: <b>{formatDate(pendingReservation.date)}</b>
						</p>
						<p className="mb-4">
							Time: <b>{pendingReservation.time}</b>
						</p>
						<div className="mb-4 flex flex-col gap-3">
							<p className="text-sm font-medium text-slate-700">
								Email confirmation
							</p>
							<label className="inline-flex items-center gap-2 text-sm text-slate-700">
								<input
									type="checkbox"
									checked={sendConfirmationToInbox}
									onChange={(e) =>
										setSendConfirmationToInbox(
											e.target.checked,
										)
									}
								/>
								<span>Send confirmation to my inbox</span>
							</label>
						</div>
						<div className="flex gap-3 justify-end">
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									onConfirmReservation(false);
								}}
								disabled={isProcessingConfirmation}
								className="px-3 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									onConfirmReservation(true);
								}}
								disabled={isProcessingConfirmation}
								className="px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
							>
								{isProcessingConfirmation
									? "Saving..."
									: "Confirm"}
							</button>
						</div>
					</div>
				</div>
			)}

			{showPendingSelectionConfirmModal && pendingSelections.length > 0 && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
					<div className="bg-white rounded-md p-6 w-[90%] max-w-xl">
						<h4 className="font-semibold mb-3">Confirm Reservations</h4>
						<div className="mb-4">
							<p className="text-sm font-medium text-slate-700 mb-2">
								Selected reservations
							</p>
							<div className="max-h-56 overflow-y-auto space-y-2">
								{summarizeReservations(pendingSelections).map((group) => (
									<div
										key={group.key}
										className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
									>
										<p className="font-semibold text-slate-800">
											{formatDate(group.date)}
										</p>
										<p className="mt-1">
											<span className="font-medium">Time:</span> {group.timeLabel}
										</p>
										<p>
											<span className="font-medium">Location(s):</span> {group.location}
										</p>
										<p>
											<span className="font-medium">Station(s):</span> {group.station ?? "N/A"}
										</p>
									</div>
								))}
							</div>
						</div>
						<div className="mb-4 flex flex-col gap-3">
							<p className="text-sm font-medium text-slate-700">
								Email confirmation
							</p>
							<label className="inline-flex items-center gap-2 text-sm text-slate-700">
								<input
									type="checkbox"
									checked={sendConfirmationToInbox}
									onChange={(e) =>
										setSendConfirmationToInbox(e.target.checked)
									}
								/>
								<span>Send confirmation to my inbox</span>
							</label>
						</div>
						<div className="flex gap-3 justify-end">
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									handleConfirmSelectedReservations(false).catch((error) => {
										console.warn("Failed to close reservation confirmation.", error);
									});
								}}
								disabled={isProcessingConfirmation}
								className="px-3 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									handleConfirmSelectedReservations(true).catch((error) => {
										console.warn("Failed to confirm selected reservations.", error);
									});
								}}
								disabled={isProcessingConfirmation}
								className="px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
							>
								{isProcessingConfirmation ? "Saving..." : "Confirm"}
							</button>
						</div>
					</div>
				</div>
			)}

			{pendingDeleteIds && pendingDeleteIds.length > 0 && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
					<div className="bg-white rounded-md p-6 w-[90%] max-w-xl">
						<h4 className="font-semibold mb-3">
							Delete Reservation
						</h4>
						<p className="mb-4 text-slate-700">
							Are you sure you want to delete this reservation{pendingDeleteIds.length > 1 ? " group" : ""}?
							This action cannot be undone.
						</p>
						<div className="flex gap-3 justify-end">
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									handleConfirmDelete(false);
								}}
								className="px-3 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									handleConfirmDelete(true);
								}}
								className="px-3 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700"
							>
								Delete
							</button>
						</div>
					</div>
				</div>
			)}

			{showLimitModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
					<div className="bg-white rounded-md p-6 w-[90%] max-w-xl">
						<h4 className="font-semibold mb-3 text-red-600">
							Reservation Limit Reached
						</h4>
						<p className="mb-4 text-slate-700">
							You have reached the maximum of 3 active
							reservations. Please delete one before adding a new
							reservation.
						</p>
						<div className="flex gap-3 justify-end">
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									setShowLimitModal(false);
								}}
								className="px-3 py-2 bg-slate-600 text-white rounded text-sm font-medium hover:bg-slate-700"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}

			{showReminderWaitModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
					<div className="bg-white rounded-md p-6 w-[90%] max-w-xl">
						<h4 className="font-semibold mb-3 text-blue-700">
							Please wait before sending again
						</h4>
						<p className="mb-4 text-slate-700">
							Wait {reminderWaitSeconds} second{reminderWaitSeconds === 1 ? "" : "s"} before clicking Send reservation reminder again.
						</p>
						<div className="flex gap-3 justify-end">
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									setShowReminderWaitModal(false);
								}}
								className="px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
							>
								OK
							</button>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}
