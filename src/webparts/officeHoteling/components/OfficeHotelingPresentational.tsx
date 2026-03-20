import * as React from "react";
import {
	canDeleteReservation,
	formatReservationDate as formatDate,
	type Reservation,
	type ReservationGroup,
	type ReservationSummaryGroup,
	type TimeSlot,
} from "./officeHotelingUtils";

interface MyReservationsSectionProps {
	groupedReservations: ReservationGroup[];
	reminderCooldownByReservationId: Record<string, number>;
	onDeleteGroup: (reservationIds: string[]) => void;
	onSendReminderGroup: (reservationIds: string[]) => void;
}

export function MyReservationsSection({
	groupedReservations,
	reminderCooldownByReservationId,
	onDeleteGroup,
	onSendReminderGroup,
}: MyReservationsSectionProps): JSX.Element {
	return (
		<div className="mb-6">
			<h3 className="mb-3 font-semibold text-slate-800">
				My Reservations ({groupedReservations.length})
			</h3>
			{groupedReservations.length === 0 && (
				<p className="text-sm text-slate-600">
					You currently have no reservation.
				</p>
			)}
			<div className="flex flex-wrap justify-start gap-3">
				{groupedReservations.map((group) => {
					const canDeleteGroup = group.reservations.every(
						(reservation) => canDeleteReservation(reservation),
					);
					const reminderCooldown =
						reminderCooldownByReservationId[
							group.reservations[0].id
						] ?? 0;
					const stationEntries = (group.desk ?? "Station N/A")
						.split(" | ")
						.map((entry) => entry.trim())
						.filter(Boolean);

					return (
						<div
							key={group.key}
							className="flex w-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md md:w-[calc(50%-0.375rem)] xl:w-[calc(33.333%-0.5rem)]"
						>
							<div className="mb-4 flex-1 border-b border-slate-100 pb-3">
								<div className="flex items-start justify-between gap-3">
									<p className="text-sm leading-5 font-semibold text-slate-900">
										{formatDate(group.date)}
									</p>
									<span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
										{group.timeLabel}
									</span>
								</div>
								<p className="mt-2 text-xs tracking-wide text-slate-500 uppercase">
									Station
								</p>
								<div className="space-y-1">
									{stationEntries.map(
										(stationEntry, index) => (
											<p
												key={`${group.key}-station-${index}`}
												className="text-sm font-medium text-slate-700"
											>
												{stationEntry}
											</p>
										),
									)}
								</div>
								<p className="mt-2 text-xs tracking-wide text-slate-500 uppercase">
									Location
								</p>
								<p className="text-sm text-slate-700">
									{group.location}
								</p>
							</div>

							<div className="flex flex-col gap-2">
								<button
									type="button"
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										onDeleteGroup(
											group.reservations.map(
												(reservation) => reservation.id,
											),
										);
									}}
									disabled={!canDeleteGroup}
									className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
								>
									Delete reservation
								</button>

								{!canDeleteGroup && (
									<p className="text-[11px] text-slate-500">
										Delete is disabled within 24 hours of
										the reservation.
									</p>
								)}

								<button
									type="button"
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										onSendReminderGroup(
											group.reservations.map(
												(reservation) => reservation.id,
											),
										);
									}}
									className="w-full rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
								>
									{reminderCooldown > 0
										? `Send reservation reminder (${reminderCooldown}s)`
										: "Send reservation reminder"}
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

interface AddReservationSectionProps {
	editingReservationId?: string;
	selectedLocation: string;
	selectedDesk: string;
	officeLocations: string[];
	deskOptionsForSelectedLocation: string[];
	openDropdown?: "location" | "station";
	setOpenDropdown: React.Dispatch<
		React.SetStateAction<"location" | "station" | undefined>
	>;
	onSelectLocation: (location: string) => void;
	onSelectDesk: (desk: string) => void;
	dropdownButtonClassName: string;
	dropdownMenuClassName: string;
	dropdownOptionClassName: string;
	locationDropdownRef: React.RefObject<HTMLDivElement>;
	stationDropdownRef: React.RefObject<HTMLDivElement>;
	handlePreviousWeek: () => void;
	handleNextWeek: () => void;
	timeSlots: TimeSlot[];
	isPendingSelection: (
		date: string,
		timeOfDay: "Morning" | "Afternoon",
	) => boolean;
	handleSelectTimeSlot: (
		slot: TimeSlot,
		timeOfDay: "Morning" | "Afternoon",
	) => void;
	pendingReservation?: Reservation;
	pendingSelectionsCount: number;
	onBack: () => void;
	onShowConfirmModal: () => void;
}

export function AddReservationSection({
	editingReservationId,
	selectedLocation,
	selectedDesk,
	officeLocations,
	deskOptionsForSelectedLocation,
	openDropdown,
	setOpenDropdown,
	onSelectLocation,
	onSelectDesk,
	dropdownButtonClassName,
	dropdownMenuClassName,
	dropdownOptionClassName,
	locationDropdownRef,
	stationDropdownRef,
	handlePreviousWeek,
	handleNextWeek,
	timeSlots,
	isPendingSelection,
	handleSelectTimeSlot,
	pendingReservation,
	pendingSelectionsCount,
	onBack,
	onShowConfirmModal,
}: AddReservationSectionProps): JSX.Element {
	return (
		<div className="rounded-lg border border-slate-300 p-4">
			<div className="mb-4">
				<div className="mb-4">
					<h3 className="mb-3 font-semibold text-slate-800">
						{editingReservationId
							? "Edit Reservation"
							: "Add a New Reservation"}
					</h3>
					{!editingReservationId && (
						<div className="mb-4 flex items-center justify-between gap-4">
							<div className="w-1/2">
								<label className="mb-2 block text-sm font-medium text-slate-700">
									Select location
								</label>
								<div
									className="relative"
									ref={locationDropdownRef}
								>
									<button
										type="button"
										onClick={() =>
											setOpenDropdown((current) =>
												current === "location"
													? undefined
													: "location",
											)
										}
										className={dropdownButtonClassName}
									>
										<span>{selectedLocation}</span>
										<span className="text-slate-500">
											▾
										</span>
									</button>

									{openDropdown === "location" && (
										<div className={dropdownMenuClassName}>
											{officeLocations.map((location) => (
												<button
													key={location}
													type="button"
													onClick={() => {
														onSelectLocation(
															location,
														);
														setOpenDropdown(
															undefined,
														);
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
							<div className="flex w-1/2 justify-end">
								<div className="w-3/4">
									<label className="mb-2 block text-right text-sm font-medium text-slate-700">
										Select Station
									</label>
									<div
										className="relative"
										ref={stationDropdownRef}
									>
										<button
											type="button"
											onClick={() =>
												setOpenDropdown((current) =>
													current === "station"
														? undefined
														: "station",
												)
											}
											className={dropdownButtonClassName}
										>
											<span>
												{selectedDesk ||
													"Select Station"}
											</span>
											<span className="text-slate-500">
												▾
											</span>
										</button>

										{openDropdown === "station" && (
											<div
												className={
													dropdownMenuClassName
												}
											>
												{deskOptionsForSelectedLocation.map(
													(deskOption) => (
														<button
															key={deskOption}
															type="button"
															onClick={() => {
																onSelectDesk(
																	deskOption,
																);
																setOpenDropdown(
																	undefined,
																);
															}}
															className={`${dropdownOptionClassName} ${selectedDesk === deskOption ? "bg-slate-100" : ""}`}
														>
															{deskOption}
														</button>
													),
												)}
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
				<div className="mb-4 flex items-center justify-between">
					<button
						type="button"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							handlePreviousWeek();
						}}
						className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
						className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
					>
						Next Week →
					</button>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full table-fixed border-collapse">
						<thead>
							<tr>
								<th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase">
									Time Slot
								</th>
								{timeSlots.map((slot) => (
									<th
										key={slot.date}
										className="border border-slate-300 bg-slate-100 px-2 py-1 text-center text-slate-700"
									>
										<div className="text-xs font-semibold tracking-wide uppercase">
											{slot.day.split(",")[0]}
										</div>
										<div className="text-xs text-slate-500">
											{slot.day.split(",")[1]?.trim() ??
												""}
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
								{timeSlots.map((slot) => {
									const selected = isPendingSelection(
										slot.date,
										"Morning",
									);
									return (
										<td
											key={`${slot.date}-morning`}
											className="border border-slate-300 p-2"
										>
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
												className={`w-full rounded px-2 py-1.5 text-xs font-medium transition-colors ${slot.isHoliday || slot.isPast ? "cursor-not-allowed bg-slate-200 text-slate-500" : selected ? "cursor-pointer bg-blue-200 hover:bg-blue-300" : slot.morning ? "cursor-pointer bg-green-200 hover:bg-green-300" : "cursor-not-allowed bg-pink-200 opacity-50"}`}
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
										</td>
									);
								})}
							</tr>
							<tr>
								<td className="border border-slate-300 bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-700">
									Afternoon (12pm-5pm)
								</td>
								{timeSlots.map((slot) => {
									const selected = isPendingSelection(
										slot.date,
										"Afternoon",
									);
									return (
										<td
											key={`${slot.date}-afternoon`}
											className="border border-slate-300 p-2"
										>
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
												className={`w-full rounded px-2 py-1.5 text-xs font-medium transition-colors ${slot.isHoliday || slot.isPast ? "cursor-not-allowed bg-slate-200 text-slate-500" : selected ? "cursor-pointer bg-blue-200 hover:bg-blue-300" : slot.afternoon ? "cursor-pointer bg-green-200 hover:bg-green-300" : "cursor-not-allowed bg-pink-200 opacity-50"}`}
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
										</td>
									);
								})}
							</tr>
						</tbody>
					</table>
				</div>
			</div>
			<div className="mt-4 flex items-center justify-between">
				{!pendingReservation && (
					<button
						type="button"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onBack();
						}}
						className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
							onShowConfirmModal();
						}}
						disabled={pendingSelectionsCount === 0}
						className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
					>
						Confirm
					</button>
				)}
			</div>
		</div>
	);
}

interface PendingReservationModalProps {
	pendingReservation: Reservation;
	sendConfirmationToInbox: boolean;
	setSendConfirmationToInbox: (checked: boolean) => void;
	isProcessingConfirmation: boolean;
	onConfirmReservation: (confirmed: boolean) => void;
}

export function PendingReservationModal({
	pendingReservation,
	sendConfirmationToInbox,
	setSendConfirmationToInbox,
	isProcessingConfirmation,
	onConfirmReservation,
}: PendingReservationModalProps): JSX.Element {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
			<div className="w-[90%] max-w-xl rounded-md bg-white p-6">
				<h4 className="mb-3 font-semibold">Confirm Reservation</h4>
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
								setSendConfirmationToInbox(e.target.checked)
							}
						/>
						<span>Send confirmation to my inbox</span>
					</label>
				</div>
				<div className="flex justify-end gap-3">
					<button
						type="button"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onConfirmReservation(false);
						}}
						disabled={isProcessingConfirmation}
						className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
						className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isProcessingConfirmation ? "Saving..." : "Confirm"}
					</button>
				</div>
			</div>
		</div>
	);
}

interface PendingSelectionConfirmModalProps {
	show: boolean;
	summaryGroups: ReservationSummaryGroup[];
	sendConfirmationToInbox: boolean;
	setSendConfirmationToInbox: (checked: boolean) => void;
	isProcessingConfirmation: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}

export function PendingSelectionConfirmModal({
	show,
	summaryGroups,
	sendConfirmationToInbox,
	setSendConfirmationToInbox,
	isProcessingConfirmation,
	onCancel,
	onConfirm,
}: PendingSelectionConfirmModalProps): JSX.Element {
	if (!show || summaryGroups.length === 0) {
		return <></>;
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
			<div className="w-[90%] max-w-xl rounded-md bg-white p-6">
				<h4 className="mb-3 font-semibold">Confirm Reservations</h4>
				<div className="mb-4">
					<p className="mb-2 text-sm font-medium text-slate-700">
						Selected reservations
					</p>
					<div className="max-h-56 space-y-2 overflow-y-auto">
						{summaryGroups.map((group) => {
							const stationEntries = (group.station ?? "N/A")
								.split(" | ")
								.map((entry) => entry.trim())
								.filter(Boolean);

							return (
								<div
									key={group.key}
									className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
								>
									<p className="font-semibold text-slate-800">
										{formatDate(group.date)}
									</p>
									<p className="mt-1">
										<span className="font-medium">
											Time:
										</span>{" "}
										{group.timeLabel}
									</p>
									<p>
										<span className="font-medium">
											Location(s):
										</span>{" "}
										{group.location}
									</p>
									<div>
										<span className="font-medium">
											Station(s):
										</span>
										<div className="mt-1 space-y-0.5">
											{stationEntries.map(
												(stationEntry, index) => (
													<p
														key={`${group.key}-confirm-station-${index}`}
													>
														{stationEntry}
													</p>
												),
											)}
										</div>
									</div>
								</div>
							);
						})}
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
				<div className="flex justify-end gap-3">
					<button
						type="button"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onCancel();
						}}
						disabled={isProcessingConfirmation}
						className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onConfirm();
						}}
						disabled={isProcessingConfirmation}
						className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isProcessingConfirmation ? "Saving..." : "Confirm"}
					</button>
				</div>
			</div>
		</div>
	);
}

interface DeleteReservationModalProps {
	pendingDeleteIds?: string[];
	onConfirmDelete: (confirmed: boolean) => void;
}

export function DeleteReservationModal({
	pendingDeleteIds,
	onConfirmDelete,
}: DeleteReservationModalProps): JSX.Element {
	if (!pendingDeleteIds || pendingDeleteIds.length === 0) {
		return <></>;
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
			<div className="w-[90%] max-w-xl rounded-md bg-white p-6">
				<h4 className="mb-3 font-semibold">Delete Reservation</h4>
				<p className="mb-4 text-slate-700">
					Are you sure you want to delete this reservation
					{pendingDeleteIds.length > 1 ? " group" : ""}? This action
					cannot be undone.
				</p>
				<div className="flex justify-end gap-3">
					<button
						type="button"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onConfirmDelete(false);
						}}
						className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onConfirmDelete(true);
						}}
						className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
					>
						Delete
					</button>
				</div>
			</div>
		</div>
	);
}

interface LimitModalProps {
	show: boolean;
	onClose: () => void;
}

export function LimitModal({ show, onClose }: LimitModalProps): JSX.Element {
	if (!show) {
		return <></>;
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
			<div className="w-[90%] max-w-xl rounded-md bg-white p-6">
				<h4 className="mb-3 font-semibold text-red-600">
					Reservation Limit Reached
				</h4>
				<p className="mb-4 text-slate-700">
					You have reached the maximum of 3 active reservations.
					Please delete one before adding a new reservation.
				</p>
				<div className="flex justify-end gap-3">
					<button
						type="button"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onClose();
						}}
						className="rounded bg-slate-600 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}

interface ReminderWaitModalProps {
	show: boolean;
	reminderWaitSeconds: number;
	onClose: () => void;
}

export function ReminderWaitModal({
	show,
	reminderWaitSeconds,
	onClose,
}: ReminderWaitModalProps): JSX.Element {
	if (!show) {
		return <></>;
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
			<div className="w-[90%] max-w-xl rounded-md bg-white p-6">
				<h4 className="mb-3 font-semibold text-blue-700">
					Please wait before sending again
				</h4>
				<p className="mb-4 text-slate-700">
					Wait {reminderWaitSeconds} second
					{reminderWaitSeconds === 1 ? "" : "s"} before clicking Send
					reservation reminder again.
				</p>
				<div className="flex justify-end gap-3">
					<button
						type="button"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onClose();
						}}
						className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
					>
						OK
					</button>
				</div>
			</div>
		</div>
	);
}
