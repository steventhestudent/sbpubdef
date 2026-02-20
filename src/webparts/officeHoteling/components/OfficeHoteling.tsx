import * as React from "react";
import type { IOfficeHotelingProps } from "./IOfficeHotelingProps";
import { offices } from "../../../webparts/officeInformation/components/Offices";
import { GraphClient, MSGraphClientV3 } from "../../../utils/graph/GraphClient";
import { getSP } from "../../../utils/pnpjsConfig";
import {
	readHotelingReservations,
	writeHotelingReservations,
} from "../../../utils/officeHotelingSync";

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

const OFFICE_LOCATIONS = offices.map(office => office.name);

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

const generateTimeSlots = (startDate: Date, bookedSlots: Set<string>, desk?: string): TimeSlot[] => {
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
	const [selectedLocation, setSelectedLocation] = React.useState(OFFICE_LOCATIONS[0]);
	const [selectedDesk, setSelectedDesk] = React.useState<string>("Desk 1");
	const [reservations, setReservations] = React.useState<Reservation[]>(() => readHotelingReservations());
	const [editingReservationId, setEditingReservationId] = React.useState<string | null>(null);
	const [viewMode, setViewMode] = React.useState<"my" | "add">("my");
	const [showCalendar, setShowCalendar] = React.useState(false);
	const [weekStartDate, setWeekStartDate] = React.useState<Date>(() => getMondayOfWeek(new Date()));
	const [bookedSlots, setBookedSlots] = React.useState<Set<string>>(new Set());
	const [pendingReservation, setPendingReservation] = React.useState<Reservation | null>(null);
	const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
	const [showLimitModal, setShowLimitModal] = React.useState<boolean>(false);
	const [currentReservationIndex, setCurrentReservationIndex] = React.useState<number>(0);
	const [sendConfirmationToInbox, setSendConfirmationToInbox] = React.useState<boolean>(true);
	const [sendConfirmationToCustomEmail, setSendConfirmationToCustomEmail] = React.useState<boolean>(false);
	const [customConfirmationEmail, setCustomConfirmationEmail] = React.useState<string>("");
	const [addToMicrosoftCalendar, setAddToMicrosoftCalendar] = React.useState<boolean>(false);
	const [isProcessingConfirmation, setIsProcessingConfirmation] = React.useState<boolean>(false);
	const [statusMessage, setStatusMessage] = React.useState<StatusMessage | null>(null);

	React.useEffect(() => {
		const setSlots = new Set<string>();
		reservations.forEach(r => {
			setSlots.add(`${r.date}-${r.time.toLowerCase()}`);
		});
		setBookedSlots(setSlots);
		writeHotelingReservations(reservations);

		setCurrentReservationIndex(prev => {
			const maxIndex = Math.max(0, reservations.length - 1);
			return Math.min(prev, maxIndex);
		});
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

	const timeSlots = generateTimeSlots(weekStartDate, bookedSlots, selectedDesk);

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

	const getReservationDateRange = (reservation: Reservation): { start: Date; end: Date } => {
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
		const hoursUntilReservation = (reservationDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
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

	const sendReservationEmail = async (reservation: Reservation, recipientEmail: string): Promise<void> => {
		const client: MSGraphClientV3 = await GraphClient(props.context);
		const subject = `Reservation Confirmed: ${reservation.location}`;
		const bodyHtml = `
			<p>Your hoteling reservation has been confirmed.</p>
			<p><strong>Date:</strong> ${formatDate(reservation.date)}</p>
			<p><strong>Time:</strong> ${reservation.time}</p>
			<p><strong>Location:</strong> ${reservation.location}</p>
			<p><strong>Desk:</strong> ${reservation.desk ?? "N/A"}</p>
		`;

		await client.api("/me/sendMail").post({
			message: {
				subject,
				body: {
					contentType: "HTML",
					content: bodyHtml,
				},
				toRecipients: [
					{
						emailAddress: {
							address: recipientEmail,
						},
					},
				],
			},
			saveToSentItems: true,
		});
	};

	const addReservationEventToCalendar = async (reservation: Reservation): Promise<{ eventId: string; webLink?: string }> => {
		const client: MSGraphClientV3 = await GraphClient(props.context);
		const { start, end } = getReservationDateRange(reservation);

		const created: { id: string; webLink?: string } = await client.api("/me/events").post({
			subject: `Office Hoteling: ${reservation.location}`,
			body: {
				contentType: "HTML",
				content: `<p>Office hoteling reservation for ${reservation.location}${reservation.desk ? ` (${reservation.desk})` : ""}.</p>`,
			},
			start: {
				dateTime: start.toISOString(),
				timeZone: "UTC",
			},
			end: {
				dateTime: end.toISOString(),
				timeZone: "UTC",
			},
			location: {
				displayName: reservation.location,
			},
		});

		return {
			eventId: created.id,
			webLink: created.webLink,
		};
	};

	const createSharePointEventForReservation = async (
		reservation: Reservation,
	): Promise<{ itemId: number; webLink: string }> => {
		const sp = getSP(props.context);
		const list = sp.web.lists.getByTitle("Events");
		const listInfo: { Id: string } = await list.select("Id")();
		const listGuid = listInfo.Id;
		const { start, end } = getReservationDateRange(reservation);

		const added: { Id: number } = await list.items.add({
			Title: `Office Hoteling: ${reservation.location}${reservation.desk ? ` (${reservation.desk})` : ""}`,
			EventDate: start.toISOString(),
			EndDate: end.toISOString(),
			Location: reservation.location,
			Description: `Hoteling reservation (${reservation.time})${reservation.desk ? ` - ${reservation.desk}` : ""}`,
			fAllDayEvent: false,
		});

		const webLink = `${window.location.origin}/_layouts/15/Event.aspx?ListGuid=${listGuid}&ItemId=${added.Id}`;
		return { itemId: added.Id, webLink };
	};

	const deleteSharePointEventForReservation = async (reservation: Reservation): Promise<void> => {
		if (!reservation.sharePointEventId) {
			return;
		}

		const sp = getSP(props.context);
		await sp.web.lists.getByTitle("Events").items.getById(reservation.sharePointEventId).delete();
	};

	const deleteReservationEventFromCalendar = async (reservation: Reservation): Promise<void> => {
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
			const inboxEmail = (props.context.pageContext.user.email ?? "").trim();
			if (inboxEmail) {
				recipients.add(inboxEmail);
			}
		}

		if (sendConfirmationToCustomEmail) {
			const customEmail = customConfirmationEmail.trim();
			if (customEmail) {
				recipients.add(customEmail);
			}
		}

		return Array.from(recipients).join(",");
	};

	const runReservationFollowUps = async (reservation: Reservation): Promise<string[]> => {
		const followUps: Array<{ label: string; task: Promise<void> }> = [];
		const recipientEmails = getConfirmationRecipientEmail().split(",").map(email => email.trim()).filter(Boolean);

		if (recipientEmails.length === 0) {
			return ["Email confirmation failed: No recipient email address was provided."];
		}
		for (const recipientEmail of recipientEmails) {
			if (!isValidEmail(recipientEmail)) {
				return [`Email confirmation failed: Recipient email format is invalid (${recipientEmail}).`];
			}
			followUps.push({
				label: `Email confirmation (${recipientEmail})`,
				task: sendReservationEmail(reservation, recipientEmail),
			});
		}

		if (followUps.length === 0) {
			return [];
		}

		const results = await Promise.allSettled(followUps.map(f => f.task));
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

	const handleDelete = (reservationId: string): void => {
		const reservation = reservations.find(r => r.id === reservationId);
		if (!reservation || !canDeleteReservation(reservation)) {
			return;
		}
		setPendingDeleteId(reservationId);
	};

	const handleConfirmDelete = (confirmed: boolean): void => {
		if (!confirmed || !pendingDeleteId) {
			setPendingDeleteId(null);
			return;
		}

		const deletedReservation = reservations.find(r => r.id === pendingDeleteId);
		if (deletedReservation?.outlookEventId) {
			deleteReservationEventFromCalendar(deletedReservation).catch((error) => {
				const detail = extractErrorMessage(error);
				setStatusMessage({
					type: "error",
					text: `Reservation deleted, but calendar event delete failed: ${detail}`,
				});
			});
		}

		if (deletedReservation?.sharePointEventId) {
			deleteSharePointEventForReservation(deletedReservation).catch((error) => {
				const detail = extractErrorMessage(error);
				setStatusMessage({
					type: "error",
					text: `Reservation deleted, but SharePoint event delete failed: ${detail}`,
				});
			});
		}

		const newReservations = reservations.filter(r => r.id !== pendingDeleteId);
		setReservations(newReservations);
		setCurrentReservationIndex(prev => Math.min(prev, Math.max(0, newReservations.length - 1)));
		setPendingDeleteId(null);
		setEditingReservationId(null);
		setShowCalendar(false);
		setViewMode("my");
	};

	const handleSendReminder = (reservationId: string): void => {
		const reservation = reservations.find(r => r.id === reservationId);
		if (!reservation) {
			console.warn("Could not find reservation to send reminder.");
			return;
		}

		const userEmail = props.context.pageContext.user.email;
		if (!userEmail) {
			console.warn("No signed-in user email found. Reminder email was not sent.");
			return;
		}

		const sendReminder = async (): Promise<void> => {
			const client: MSGraphClientV3 = await GraphClient(props.context);
			await client.api("/me/sendMail").post({
				message: {
					subject: `Hoteling Reminder: ${reservation.location}`,
					body: {
						contentType: "HTML",
						content: `
							<p>This is your reminder for an upcoming hoteling reservation.</p>
							<p><strong>Date:</strong> ${formatDate(reservation.date)}</p>
							<p><strong>Time:</strong> ${reservation.time}</p>
							<p><strong>Location:</strong> ${reservation.location}</p>
							<p><strong>Desk:</strong> ${reservation.desk ?? "N/A"}</p>
						`,
					},
					toRecipients: [
						{
							emailAddress: {
								address: userEmail,
							},
						},
					],
				},
				saveToSentItems: true,
			});
			console.log("Reminder email sent.");
			setStatusMessage({ type: "success", text: "Reminder email sent." });
		};

		sendReminder().catch((error) => {
			const detail = extractErrorMessage(error);
			console.warn("Failed to send reminder email.", detail);
			setStatusMessage({ type: "error", text: `Reminder email failed: ${detail}` });
		});
	};

	const handleSelectTimeSlot = (slot: TimeSlot, timeOfDay: "Morning" | "Afternoon"): void => {
		if (!editingReservationId && reservations.length >= 3) {
			setShowLimitModal(true);
			return;
		}

		const newPending: Reservation = {
			id: editingReservationId ? editingReservationId : `res-${Date.now()}`,
			location: selectedLocation,
			date: slot.date,
			time: timeOfDay,
			desk: selectedDesk,
		};

		setSendConfirmationToInbox(true);
		setSendConfirmationToCustomEmail(false);
		setCustomConfirmationEmail("");
		setAddToMicrosoftCalendar(false);
		setPendingReservation(newPending);
	};

	const prevReservation = (): void => {
		setCurrentReservationIndex(i => Math.max(0, i - 1));
	};

	const nextReservation = (): void => {
		setCurrentReservationIndex(i => Math.min(reservations.length - 1, i + 1));
	};

	const handleConfirmReservation = async (confirmed: boolean): Promise<void> => {
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
				const oldReservation = reservations.find(r => r.id === editingReservationId);
				if (oldReservation) {
					const oldSlotKey = `${oldReservation.date}-${oldReservation.time.toLowerCase()}`;
					const newBookedSlots = new Set(bookedSlots);
					newBookedSlots.delete(oldSlotKey);
					newBookedSlots.add(`${pendingReservation.date}-${pendingReservation.time.toLowerCase()}`);
					setBookedSlots(newBookedSlots);

					const newReservations = reservations.map(r =>
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

				const reservationToSave: Reservation = { ...pendingReservation };
				const extraFailures: string[] = [];
				try {
					const createdSharePointEvent = await createSharePointEventForReservation(pendingReservation);
					reservationToSave.sharePointEventId = createdSharePointEvent.itemId;
					reservationToSave.sharePointEventWebLink = createdSharePointEvent.webLink;
				} catch (error) {
					extraFailures.push(`SharePoint event failed: ${extractErrorMessage(error)}`);
				}

				if (addToMicrosoftCalendar) {
					try {
						const createdEvent = await addReservationEventToCalendar(pendingReservation);
						reservationToSave.outlookEventId = createdEvent.eventId;
						reservationToSave.outlookEventWebLink = createdEvent.webLink;
					} catch (error) {
						extraFailures.push(`Calendar event failed: ${extractErrorMessage(error)}`);
					}
				}

				const newBookedSlots = new Set(bookedSlots);
				newBookedSlots.add(`${pendingReservation.date}-${pendingReservation.time.toLowerCase()}`);
				setBookedSlots(newBookedSlots);
				setReservations([...reservations, reservationToSave]);
				const followUpFailures = await runReservationFollowUps(pendingReservation);
				const allFailures = [...extraFailures, ...followUpFailures];
				if (allFailures.length > 0) {
					setStatusMessage({
						type: "error",
						text: `Reservation saved. ${allFailures.join(" | ")}`,
					});
				} else {
					setStatusMessage({ type: "success", text: "Reservation saved and follow-up actions completed." });
				}
			}
		} finally {
			setIsProcessingConfirmation(false);
			setPendingReservation(null);
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

	const sortedReservations = [...reservations].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
	const safeReservationIndex = Math.min(currentReservationIndex, Math.max(0, sortedReservations.length - 1));
	const activeReservation = sortedReservations.length > 0 ? sortedReservations[safeReservationIndex] : null;
	const canDeleteCurrentReservation =
		activeReservation
			? canDeleteReservation(activeReservation)
			: false;

	return (
		<section className="border border-[var(--webpart-border-color)] bg-[var(--webpart-bg-color)] shadow-sm p-6">
			<h2 className="text-xl font-semibold text-slate-800 mb-4">Hoteling</h2>
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
						viewMode === "my" ? "bg-blue-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
					}`}
					onClick={(e) => {
						e.stopPropagation();
						setViewMode("my");
						setShowCalendar(false);
					}}
				>
					My Reservations
				</button>
				<button
					type="button"
					className={`px-3 py-2 border border-slate-300 rounded text-sm font-medium transition-colors ${
						viewMode === "add" ? "bg-blue-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
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
					<h3 className="font-semibold text-slate-800 mb-3">My Reservations ({sortedReservations.length})</h3>
					{sortedReservations.length === 0 && (
						<p className="text-sm text-slate-600">You currently have no reservation.</p>
					)}
					<div className="space-y-3">
						{sortedReservations.length > 0 && (
							<div className="border border-slate-300 rounded-lg p-4">
								<div className="flex items-start justify-between mb-4">
									<div>
										<p className="text-sm text-slate-500">Reservation {safeReservationIndex + 1} of {sortedReservations.length}</p>
										<p className="text-slate-800 font-medium">{activeReservation ? formatDate(activeReservation.date) : ""}</p>
										<p className="text-slate-500 text-sm">{activeReservation ? `${activeReservation.time} — ${activeReservation.desk ?? ""}` : ""}</p>
									</div>
									<div className="flex items-center gap-3">
										<button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); prevReservation(); }} disabled={safeReservationIndex === 0} className="px-3 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">&lt; Prev</button>
										<button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); nextReservation(); }} disabled={safeReservationIndex >= sortedReservations.length - 1} className="px-3 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">Next &gt;</button>
									</div>
								</div>
								<div className="flex gap-4">
									<div className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded">
										<p className="text-slate-700 text-sm">Date</p>
										<p className="text-slate-900 font-semibold text-lg">{activeReservation ? formatDate(activeReservation.date) : ""}</p>
										<p className="text-slate-600 text-sm mt-2">Time: {activeReservation ? activeReservation.time : ""}</p>
									</div>
									<div className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded">
										<p className="text-slate-700 text-sm">Location</p>
										<p className="text-slate-900 font-semibold">{activeReservation ? activeReservation.location : ""}</p>
										<p className="text-slate-600 text-sm mt-2">{activeReservation ? activeReservation.desk : ""}</p>
										<div className="mt-4 flex flex-col items-end gap-2">
											<button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (activeReservation) handleDelete(activeReservation.id); }} disabled={!activeReservation || !canDeleteCurrentReservation} className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 disabled:text-slate-400 disabled:cursor-not-allowed">Delete</button>
											{!canDeleteCurrentReservation && (
												<p className="text-[11px] text-slate-500 text-right">Delete is disabled within 24 hours of the reservation.</p>
											)}
											<button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (activeReservation) handleSendReminder(activeReservation.id); }} disabled={!activeReservation} className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed">Send reminder</button>
										</div>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{viewMode === "add" && showCalendar && (
				<div className="border border-slate-300 rounded-lg p-4">
					<div className="mb-4">
						<div className="mb-4">
							<h3 className="font-semibold text-slate-800 mb-3">{editingReservationId ? "Edit Reservation" : "Add a New Reservation"}</h3>
							{!editingReservationId && (
								<div className="mb-4 flex items-center justify-between gap-4">
									<div className="w-1/2">
										<label className="block text-sm font-medium text-slate-700 mb-2">Select location</label>
										<select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
											{OFFICE_LOCATIONS.map((location) => (
												<option key={location} value={location}>{location}</option>
											))}
										</select>
									</div>
									<div className="w-1/2 flex justify-end">
										<div className="w-3/4">
											<label className="block text-sm font-medium text-slate-700 mb-2 text-right">Select desk</label>
											<select value={selectedDesk} onChange={(e) => setSelectedDesk(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
												<option>Desk 1</option>
												<option>Desk 2</option>
												<option>Desk 3</option>
												<option>Desk 4</option>
											</select>
										</div>
									</div>
								</div>
							)}
						</div>
						<div className="flex items-center justify-between mb-4">
							<button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePreviousWeek(); }} className="px-3 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50">← Previous Week</button>
							<h3 className="font-semibold text-slate-800">{editingReservationId ? "Edit for " : ""}{selectedLocation}</h3>
							<button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNextWeek(); }} className="px-3 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50">Next Week →</button>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full border-collapse table-fixed">
								<thead>
									<tr>
										<th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Time Slot</th>
										{timeSlots.map((slot) => (
											<th key={slot.date} className="border border-slate-300 bg-slate-100 px-2 py-1 text-center text-slate-700">
												<div className="text-xs font-semibold uppercase tracking-wide">{slot.day.split(",")[0]}</div>
												<div className="text-xs text-slate-500">{slot.day.split(",")[1]?.trim() ?? ""}</div>
												{slot.isHoliday && <div className="mt-1 text-[10px] text-red-600">Holiday</div>}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									<tr>
										<td className="border border-slate-300 bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-700">Morning (8am-12pm)</td>
										{timeSlots.map((slot) => (
											<td key={`${slot.date}-morning`} className="border border-slate-300 p-2">
												<button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSelectTimeSlot(slot, "Morning"); }} disabled={!slot.morning} className={`w-full px-2 py-1.5 rounded text-xs font-medium transition-colors ${slot.isHoliday || slot.isPast ? "bg-slate-200 text-slate-500 cursor-not-allowed" : slot.morning ? "bg-green-200 hover:bg-green-300 cursor-pointer" : "bg-pink-200 cursor-not-allowed opacity-50"}`}>
													{slot.isHoliday ? "Holiday" : slot.isPast ? "Past" : slot.morning ? "Available" : "Booked"}
												</button>
											</td>
										))}
									</tr>
									<tr>
										<td className="border border-slate-300 bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-700">Afternoon (12pm-5pm)</td>
										{timeSlots.map((slot) => (
											<td key={`${slot.date}-afternoon`} className="border border-slate-300 p-2">
												<button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSelectTimeSlot(slot, "Afternoon"); }} disabled={!slot.afternoon} className={`w-full px-2 py-1.5 rounded text-xs font-medium transition-colors ${slot.isHoliday || slot.isPast ? "bg-slate-200 text-slate-500 cursor-not-allowed" : slot.afternoon ? "bg-green-200 hover:bg-green-300 cursor-pointer" : "bg-pink-200 cursor-not-allowed opacity-50"}`}>
													{slot.isHoliday ? "Holiday" : slot.isPast ? "Past" : slot.afternoon ? "Available" : "Booked"}
												</button>
											</td>
										))}
									</tr>
								</tbody>
							</table>
						</div>
					</div>
					<div className="flex gap-3 mt-4">
						{!pendingReservation && (
							<button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCalendar(false); setEditingReservationId(null); setViewMode("my"); }} className="px-4 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50">Back</button>
						)}
					</div>
				</div>
			)}

			{pendingReservation && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
					<div className="bg-white rounded-md p-6 w-[90%] max-w-xl">
						<h4 className="font-semibold mb-3">Confirm Reservation</h4>
						<p className="mb-2">Location: <b>{pendingReservation.location}</b></p>
						<p className="mb-2">Desk: <b>{pendingReservation.desk}</b></p>
						<p className="mb-2">Date: <b>{formatDate(pendingReservation.date)}</b></p>
						<p className="mb-4">Time: <b>{pendingReservation.time}</b></p>
						<div className="mb-4 flex flex-col gap-3">
							<p className="text-sm font-medium text-slate-700">Email confirmation</p>
							<label className="inline-flex items-center gap-2 text-sm text-slate-700">
								<input
									type="checkbox"
									checked={sendConfirmationToInbox}
									onChange={(e) => setSendConfirmationToInbox(e.target.checked)}
								/>
								<span>Send confirmation to my inbox</span>
							</label>
							<label className="inline-flex items-center gap-2 text-sm text-slate-700">
								<input
									type="checkbox"
									checked={sendConfirmationToCustomEmail}
									onChange={(e) => setSendConfirmationToCustomEmail(e.target.checked)}
								/>
								<span>Select email to send confirmation</span>
							</label>
							{sendConfirmationToCustomEmail && (
								<input
									type="email"
									value={customConfirmationEmail}
									onChange={(e) => setCustomConfirmationEmail(e.target.value)}
									placeholder="name@domain.com"
									className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							)}
							<label className="inline-flex items-center gap-2 text-sm text-slate-700">
								<input
									type="checkbox"
									checked={addToMicrosoftCalendar}
									onChange={(e) => setAddToMicrosoftCalendar(e.target.checked)}
								/>
								<span>Add this reservation to my Microsoft calendar</span>
							</label>
						</div>
						<div className="flex gap-3 justify-end">
							<button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onConfirmReservation(false); }} disabled={isProcessingConfirmation} className="px-3 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed">Cancel</button>
							<button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onConfirmReservation(true); }} disabled={isProcessingConfirmation} className="px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed">{isProcessingConfirmation ? "Saving..." : "Confirm"}</button>
						</div>
					</div>
				</div>
			)}

			{pendingDeleteId && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
					<div className="bg-white rounded-md p-6 w-[90%] max-w-xl">
						<h4 className="font-semibold mb-3">Delete Reservation</h4>
						<p className="mb-4 text-slate-700">Are you sure you want to delete this reservation? This action cannot be undone.</p>
						<div className="flex gap-3 justify-end">
							<button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleConfirmDelete(false); }} className="px-3 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
							<button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleConfirmDelete(true); }} className="px-3 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700">Delete</button>
						</div>
					</div>
				</div>
			)}

			{showLimitModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
					<div className="bg-white rounded-md p-6 w-[90%] max-w-xl">
						<h4 className="font-semibold mb-3 text-red-600">Reservation Limit Reached</h4>
						<p className="mb-4 text-slate-700">You have reached the maximum of 3 active reservations. Please delete one before adding a new reservation.</p>
						<div className="flex gap-3 justify-end">
							<button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowLimitModal(false); }} className="px-3 py-2 bg-slate-600 text-white rounded text-sm font-medium hover:bg-slate-700">Close</button>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}
