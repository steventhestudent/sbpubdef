import * as React from "react";
import type { IOfficeHotelingProps } from "./IOfficeHotelingProps";
import { GraphClient, MSGraphClientV3 } from "@utils/graph/GraphClient";
import { AadHttpClient } from "@microsoft/sp-http";
import { HotelingService } from "@services/HotelingService";
import { ISPFXContext, SPFx as spSPFx, spfi, SPFI } from "@pnp/sp";
import {
	buildReservationSummaryEmailHtml,
	canDeleteReservation,
	generateTimeSlots,
	getMondayOfWeek,
	getReservationDateRange,
	LOCATION_DESK_OPTIONS,
	OFFICE_LOCATIONS,
	REMINDER_COOLDOWN_SECONDS,
	summarizeReservations,
	type Reservation,
	type ReservationGroup,
	type StatusMessage,
	type TimeSlot,
} from "./officeHotelingUtils";
import {
	AddReservationSection,
	DeleteReservationModal,
	LimitModal,
	MyReservationsSection,
	PendingReservationModal,
	PendingSelectionConfirmModal,
	ReminderWaitModal,
} from "./OfficeHotelingPresentational";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";

export function OfficeHoteling(props: IOfficeHotelingProps): JSX.Element {
	// Initialize Hoteling Service
	const hotelingService = new HotelingService(props.context);
	const userEmail = props.context.pageContext.user.email || "";

	const [selectedLocation, setSelectedLocation] = React.useState(
		OFFICE_LOCATIONS[0],
	);
	const [selectedDesk, setSelectedDesk] = React.useState<string>(
		LOCATION_DESK_OPTIONS[OFFICE_LOCATIONS[0]][0],
	);
	const [reservations, setReservations] = React.useState<Reservation[]>([]);
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
	const [pendingDeleteIds, setPendingDeleteIds] = React.useState<
		string[] | null
	>(null);
	const [showLimitModal, setShowLimitModal] = React.useState<boolean>(false);
	const [sendConfirmationToInbox, setSendConfirmationToInbox] =
		React.useState<boolean>(true);
	const [isProcessingConfirmation, setIsProcessingConfirmation] =
		React.useState<boolean>(false);
	const [statusMessage, setStatusMessage] =
		React.useState<StatusMessage | null>(null);

	// Load reservations from SharePoint on mount
	React.useEffect(() => {
		const loadReservations = async (): Promise<void> => {
			try {
				const spReservations =
					await hotelingService.getMyReservations(userEmail);
				// Convert IReservation to Reservation format
				const converted: Reservation[] = spReservations.map((r) => ({
					id: r.Id?.toString() || `res-${Date.now()}`,
					location: r.Location,
					date: r.ReservationDate.toISOString().split("T")[0],
					time: r.TimeBlock as "Morning" | "Afternoon",
					desk: r.Desk,
					spListItemId: r.Id, // Store the SharePoint list item ID
				}));
				setReservations(converted);
			} catch (error) {
				console.error(
					"Failed to load reservations from SharePoint:",
					error,
				);
				setStatusMessage({
					type: "error",
					text: "Failed to load reservations. Please refresh the page.",
				});
			}
		};

		setTimeout(async () => loadReservations());
	}, []);

	const [pendingSelections, setPendingSelections] = React.useState<
		Reservation[]
	>([]);
	const [
		showPendingSelectionConfirmModal,
		setShowPendingSelectionConfirmModal,
	] = React.useState<boolean>(false);
	const [
		reminderCooldownByReservationId,
		setReminderCooldownByReservationId,
	] = React.useState<Record<string, number>>({});
	const [reminderWaitSeconds, setReminderWaitSeconds] =
		React.useState<number>(0);
	const [showReminderWaitModal, setShowReminderWaitModal] =
		React.useState<boolean>(false);
	const [openDropdown, setOpenDropdown] = React.useState<
		"location" | "station" | undefined
	>(undefined);
	const locationDropdownRef = React.useRef<HTMLDivElement | null>(null);
	const stationDropdownRef = React.useRef<HTMLDivElement | null>(null);

	React.useEffect(() => {
		const setSlots = new Set<string>();
		reservations.forEach((r) => {
			setSlots.add(`${r.date}-${r.time.toLowerCase()}`);
		});
		setBookedSlots(setSlots);
	}, [reservations]);

	React.useEffect(() => {
		if (!statusMessage) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			setStatusMessage(null);
		}, 5000);

		return () => window.clearTimeout(timeoutId);
	}, [statusMessage]);

	React.useEffect(() => {
		const locationDeskOptions =
			LOCATION_DESK_OPTIONS[selectedLocation] ?? [];
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
				setOpenDropdown(undefined);
			}
		};

		document.addEventListener("mousedown", handleDocumentClick);
		return () =>
			document.removeEventListener("mousedown", handleDocumentClick);
	}, []);

	React.useEffect(() => {
		const hasActiveCooldown = Object.values(
			reminderCooldownByReservationId,
		).some((seconds) => seconds > 0);
		if (!hasActiveCooldown) {
			return;
		}

		const intervalId = window.setInterval(() => {
			setReminderCooldownByReservationId((current) => {
				const nextEntries = Object.entries(current)
					.map(
						([reservationId, seconds]) =>
							[reservationId, Math.max(0, seconds - 1)] as const,
					)
					.filter(([, seconds]) => seconds > 0);

				return Object.fromEntries(nextEntries);
			});
		}, 1000);

		return () => window.clearInterval(intervalId);
	}, [reminderCooldownByReservationId]);

	const timeSlots = generateTimeSlots(weekStartDate, bookedSlots);

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

	const sendEmailViaFunction = async (
		toEmails: string[],
		subject: string,
		body: string,
	): Promise<void> => {
		const client: AadHttpClient =
			await props.context.aadHttpClientFactory.getClient(
				ENV.FUNCTION_API_APP_ID,
			);

		const payload = {
			to_email: toEmails,
			subject,
			body,
			content_type: "HTML",
		};

		const response = await client.post(
			ENV.FUNCTION_BASE_URL + "/api/SendEmail",
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
				self.findIndex((candidate) => candidate.id === item.id) ===
				index,
		);

		await sendReservationSummaryEmail(relatedReservations, recipientEmail, {
			titleText: "Reservation Confirmed",
			introText: "Your hoteling reservation has been confirmed.",
			subjectPrefix: "Reservation Confirmed",
		});
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

		const subject =
			includeAllDayInSubject && includesAllDay
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

	const handleConfirmDelete = async (confirmed: boolean): Promise<void> => {
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
			// Delete from SharePoint HotelingReservations list
			if (reservation.spListItemId) {
				try {
					setTimeout(
						async () =>
							await hotelingService.deleteReservation(
								reservation.spListItemId!,
							),
					);
				} catch (error) {
					const detail = extractErrorMessage(error);
					setStatusMessage({
						type: "error",
						text: `Failed to delete reservation from SharePoint: ${detail}`,
					});
					setPendingDeleteIds(null);
					return;
				}
			}

			// Delete calendar events
			if (
				reservation.outlookEventId &&
				!processedOutlookEventIds.has(reservation.outlookEventId)
			) {
				processedOutlookEventIds.add(reservation.outlookEventId);
				deleteReservationEventFromCalendar(reservation).catch(
					(error) => {
						if (isDeleteAlreadyAppliedError(error)) {
							return;
						}
						const detail = extractErrorMessage(error);
						setStatusMessage({
							type: "error",
							text: `Reservation deleted, but calendar event delete failed: ${detail}`,
						});
					},
				);
			}

			const sharePointEventId =
				getReservationSharePointEventId(reservation);
			if (
				sharePointEventId &&
				!processedSharePointEventIds.has(sharePointEventId)
			) {
				processedSharePointEventIds.add(sharePointEventId);
				deleteSharePointEventForReservation(reservation).catch(
					(error) => {
						if (isDeleteAlreadyAppliedError(error)) {
							return;
						}
						const detail = extractErrorMessage(error);
						setStatusMessage({
							type: "error",
							text: `Reservation deleted, but SharePoint event delete failed: ${detail}`,
						});
					},
				);
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
		const cooldownSeconds =
			reminderCooldownByReservationId[cooldownKey] ?? 0;
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
				await sendReservationSummaryEmail(
					reminderReservations,
					userEmail,
					{
						titleText: "Reservation Reminder",
						introText:
							"This is your reminder for an upcoming hoteling reservation.",
						subjectPrefix: "Hoteling Reminder",
						includeAllDayInSubject: true,
					},
				);
				console.log("Reminder email sent.");
				setStatusMessage({
					type: "success",
					text: "Reminder email sent.",
				});
			} catch (e: unknown) {
				console.error("Failed to send reminder email (exception).", e);
				const errorMessage = e instanceof Error ? e.message : String(e);
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
				const existingSelection =
					pendingSelections[existingSelectionIndex];
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
				selection.date === date && selection.time === timeOfDay,
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
							await deleteSharePointEventForReservation(
								pairedReservation,
							);
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

						reservationToSave.sharePointEventId =
							createdAllDayEvent.itemId;
						reservationToSave.sharePointEventWebLink =
							createdAllDayEvent.webLink;

						updatedExistingReservations = reservations.map(
							(reservation) =>
								reservation.id === pairedReservation.id
									? {
											...reservation,
											sharePointEventId:
												createdAllDayEvent.itemId,
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
				setReservations([
					...updatedExistingReservations,
					reservationToSave,
				]);
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
				// Save to SharePoint HotelingReservations list
				console.log("save to list..");
				try {
					const [year, month, day] = pendingSelection.date
						.split("-")
						.map(Number);
					const reservationDate = new Date(year, month - 1, day);

					console.log("Calling hotelingService.createReservation...");

					const createdId = await hotelingService.createReservation({
						Location: pendingSelection.location,
						Desk: pendingSelection.desk || "Desk 1",
						ReservationDate: reservationDate,
						TimeBlock: pendingSelection.time,
						UserEmail: userEmail,
					});

					console.log("Created reservation with ID:", createdId);
					// pendingSelection.spListItemId = createdId;
				} catch (error) {
					console.error("save failed:", error);
					extraFailures.push(
						`SharePoint reservation failed: ${extractErrorMessage(error)}`,
					);
				}

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
							await deleteSharePointEventForReservation(
								pairedReservation,
							);
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

						reservationToSave.sharePointEventId =
							createdAllDayEvent.itemId;
						reservationToSave.sharePointEventWebLink =
							createdAllDayEvent.webLink;

						workingReservations = workingReservations.map(
							(reservation) =>
								reservation.id === pairedReservation.id
									? {
											...reservation,
											sharePointEventId:
												createdAllDayEvent.itemId,
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
				workingReservations = [
					...workingReservations,
					reservationToSave,
				];
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
			const hasMorning = group.some(
				(reservation) => reservation.time === "Morning",
			);
			const hasAfternoon = group.some(
				(reservation) => reservation.time === "Afternoon",
			);
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

	const pendingSelectionSummary = React.useMemo(
		() => summarizeReservations(pendingSelections),
		[pendingSelections],
	);

	return (
		<section className="border border-[var(--webpart-border-color)] bg-[var(--webpart-bg-color)] p-6 shadow-sm">
			<h2 className="mb-4 text-xl font-semibold text-slate-800">
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
					className={`rounded border border-slate-300 px-3 py-2 text-sm font-medium transition-colors ${
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
					className={`rounded border border-slate-300 px-3 py-2 text-sm font-medium transition-colors ${
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
				<MyReservationsSection
					groupedReservations={groupedReservations}
					reminderCooldownByReservationId={
						reminderCooldownByReservationId
					}
					onDeleteGroup={handleDelete}
					onSendReminderGroup={handleSendReminder}
				/>
			)}

			{viewMode === "add" && showCalendar && (
				<AddReservationSection
					editingReservationId={editingReservationId ?? undefined}
					selectedLocation={selectedLocation}
					selectedDesk={selectedDesk}
					officeLocations={OFFICE_LOCATIONS}
					deskOptionsForSelectedLocation={
						deskOptionsForSelectedLocation
					}
					openDropdown={openDropdown}
					setOpenDropdown={setOpenDropdown}
					onSelectLocation={setSelectedLocation}
					onSelectDesk={setSelectedDesk}
					dropdownButtonClassName={dropdownButtonClassName}
					dropdownMenuClassName={dropdownMenuClassName}
					dropdownOptionClassName={dropdownOptionClassName}
					locationDropdownRef={locationDropdownRef}
					stationDropdownRef={stationDropdownRef}
					handlePreviousWeek={handlePreviousWeek}
					handleNextWeek={handleNextWeek}
					timeSlots={timeSlots}
					isPendingSelection={isPendingSelection}
					handleSelectTimeSlot={handleSelectTimeSlot}
					pendingReservation={pendingReservation ?? undefined}
					pendingSelectionsCount={pendingSelections.length}
					onBack={() => {
						setShowCalendar(false);
						setPendingSelections([]);
						setEditingReservationId(null);
						setViewMode("my");
					}}
					onShowConfirmModal={() => {
						setShowPendingSelectionConfirmModal(true);
					}}
				/>
			)}

			{pendingReservation && (
				<PendingReservationModal
					pendingReservation={pendingReservation}
					sendConfirmationToInbox={sendConfirmationToInbox}
					setSendConfirmationToInbox={setSendConfirmationToInbox}
					isProcessingConfirmation={isProcessingConfirmation}
					onConfirmReservation={onConfirmReservation}
				/>
			)}

			<PendingSelectionConfirmModal
				show={showPendingSelectionConfirmModal}
				summaryGroups={pendingSelectionSummary}
				sendConfirmationToInbox={sendConfirmationToInbox}
				setSendConfirmationToInbox={setSendConfirmationToInbox}
				isProcessingConfirmation={isProcessingConfirmation}
				onCancel={() => {
					handleConfirmSelectedReservations(false).catch((error) => {
						console.warn(
							"Failed to close reservation confirmation.",
							error,
						);
					});
				}}
				onConfirm={() => {
					handleConfirmSelectedReservations(true).catch((error) => {
						console.warn(
							"Failed to confirm selected reservations.",
							error,
						);
					});
				}}
			/>

			<DeleteReservationModal
				pendingDeleteIds={pendingDeleteIds ?? undefined}
				onConfirmDelete={handleConfirmDelete}
			/>

			<LimitModal
				show={showLimitModal}
				onClose={() => {
					setShowLimitModal(false);
				}}
			/>

			<ReminderWaitModal
				show={showReminderWaitModal}
				reminderWaitSeconds={reminderWaitSeconds}
				onClose={() => {
					setShowReminderWaitModal(false);
				}}
			/>
		</section>
	);
}
