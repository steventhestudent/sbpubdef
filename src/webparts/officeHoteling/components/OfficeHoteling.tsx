import * as React from "react";
import type { IOfficeHotelingProps } from "./IOfficeHotelingProps";
import { offices } from "@webparts/officeInformation/components/Offices";
import { HotelingService } from "@services/HotelingService";

interface Reservation {
	id: string;
	location: string;
	date: string;
	time: "Morning" | "Afternoon";
}

interface TimeSlot {
	day: string;
	date: string;
	morning: boolean;
	afternoon: boolean;
}

const OFFICE_LOCATIONS = offices.map((office) => office.name);

// Generate time slots for the next 2 weeks
const generateTimeSlots = (
	startDate: Date,
	bookedSlots: Set<string>,
): TimeSlot[] => {
	const slots: TimeSlot[] = [];
	const current = new Date(startDate);

	// Generate 14 days (2 weeks)
	for (let i = 0; i < 14; i++) {
		// Skip Saturdays (6) and Sundays (0) - only weekdays
		if (current.getDay() !== 0 && current.getDay() !== 6) {
			const dateStr = current.toISOString().split("T")[0];
			const dayName = current.toLocaleDateString("en-US", {
				weekday: "short",
				month: "numeric",
				day: "numeric",
				year: "2-digit",
			});

			slots.push({
				day: dayName,
				date: dateStr,
				morning: !bookedSlots.has(`${dateStr}-morning`),
				afternoon: !bookedSlots.has(`${dateStr}-afternoon`),
			});
		}
		current.setDate(current.getDate() + 1);
	}

	return slots;
};

export function OfficeHoteling(props: IOfficeHotelingProps): JSX.Element {
	const [selectedLocation, setSelectedLocation] = React.useState(
		OFFICE_LOCATIONS[0],
	);
	const [reservations, setReservations] = React.useState<Reservation[]>([]);
	const [editingReservationId, setEditingReservationId] = React.useState<
		string | null
	>(null);
	const [showCalendar, setShowCalendar] = React.useState(false);
	const [weekStartDate, setWeekStartDate] = React.useState<Date>(() => {
		const today = new Date();
		// Set to today if it's a weekday, or to the next Monday if weekend
		if (today.getDay() === 0) {
			today.setDate(today.getDate() + 1);
		} else if (today.getDay() === 6) {
			today.setDate(today.getDate() + 2);
		}
		return today;
	});
	const [bookedSlots, setBookedSlots] = React.useState<Set<string>>(
		new Set(),
	);

	const hotelingService = React.useMemo(
		() => new HotelingService(props.context),
		[props.context],
	);

	const loadReservations = async (): Promise<void> => {
		try {
			const myReservations = await hotelingService.getMyReservations(
				props.context.pageContext.user.email,
			);
			const allReservations = await hotelingService.getAllReservations();

			// Convert to local format
			const formattedReservations: Reservation[] = myReservations.map(
				(r) => ({
					id: r.Id?.toString() || "",
					location: r.Location,
					date: r.ReservationDate.toISOString().split("T")[0],
					time: r.TimeBlock as "Morning" | "Afternoon",
				}),
			);

			setReservations(formattedReservations);

			// Build booked slots set from all reservations
			const newBookedSlots = new Set<string>();
			allReservations.forEach((r) => {
				const dateStr = r.ReservationDate.toISOString().split("T")[0];
				const slotKey = `${dateStr}-${r.TimeBlock.toLowerCase()}`;
				newBookedSlots.add(slotKey);
			});
			setBookedSlots(newBookedSlots);
		} catch (error) {
			console.error("Error loading reservations:", error);
		}
	};

	React.useEffect(() => {
		setTimeout(async () => await loadReservations());
	}, []);

	const timeSlots = generateTimeSlots(weekStartDate, bookedSlots).slice(0, 5); // Show 5 business days (Monday-Friday)

	const handleEdit = (reservationId: string): void => {
		setEditingReservationId(reservationId);
		setShowCalendar(true);
	};

	const handleDelete = async (reservationId: string): Promise<void> => {
		if (
			window.confirm("Are you sure you want to delete this reservation?")
		) {
			try {
				await hotelingService.deleteReservation(
					parseInt(reservationId),
				);
				await loadReservations();
				setEditingReservationId(null);
				setShowCalendar(false);
			} catch (error) {
				console.error("Error deleting reservation:", error);
				alert("Failed to delete reservation");
			}
		}
	};

	const handleSendReminder = (reservationId: string): void => {
		alert("Reminder sent to your email");
	};

	const handleSelectTimeSlot = async (
		slot: TimeSlot,
		timeOfDay: "Morning" | "Afternoon",
	): Promise<void> => {
		try {
			if (editingReservationId) {
				// Delete old reservation and create new one
				await hotelingService.deleteReservation(
					parseInt(editingReservationId),
				);
			}

			// Create new reservation
			await hotelingService.createReservation({
				Location: selectedLocation,
				Desk: "Desk 1", // TODO: Add desk selection
				ReservationDate: new Date(slot.date),
				TimeBlock: timeOfDay,
				UserEmail: props.context.pageContext.user.email,
			});

			await loadReservations();
			setEditingReservationId(null);
			setShowCalendar(false);
		} catch (error) {
			console.error("Error saving reservation:", error);
			alert("Failed to save reservation");
		}
	};

	const handlePreviousWeek = (): void => {
		const prev = new Date(weekStartDate);
		prev.setDate(prev.getDate() - 7);
		// Only go back if it's not earlier than today
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		if (prev >= today) {
			setWeekStartDate(prev);
		}
	};

	const handleNextWeek = (): void => {
		const next = new Date(weekStartDate);
		next.setDate(next.getDate() + 7);
		setWeekStartDate(next);
	};

	const formatDate = (dateStr: string): string => {
		const date = new Date(dateStr);
		return date.toLocaleDateString("en-US", {
			weekday: "short",
			month: "long",
			day: "numeric",
			year: "numeric",
		});
	};

	return (
		<section className="border border-[var(--webpart-border-color)] bg-[var(--webpart-bg-color)] shadow-sm p-6">
			<h2 className="text-xl font-semibold text-slate-800 mb-4">
				Hoteling
			</h2>

			{/* Location Selector - Always Visible First */}
			{!showCalendar && (
				<div className="mb-6">
					<label className="block text-sm font-medium text-slate-700 mb-2">
						Select location
					</label>
					<select
						value={selectedLocation}
						onChange={(e) => setSelectedLocation(e.target.value)}
						className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						{OFFICE_LOCATIONS.map((location) => (
							<option key={location} value={location}>
								{location}
							</option>
						))}
					</select>
				</div>
			)}

			{/* My Reservations Section */}
			{reservations.length > 0 && !showCalendar && (
				<div className="mb-6">
					<h3 className="font-semibold text-slate-800 mb-3">
						My Reservations ({reservations.length})
					</h3>
					<div className="space-y-3">
						{reservations.map((reservation) => (
							<div
								key={reservation.id}
								className="border border-slate-300 rounded-lg p-4"
							>
								<div className="grid grid-cols-2 gap-6">
									{/* Left: Actions */}
									<div className="flex flex-col justify-start gap-2">
										<button
											onClick={() =>
												handleEdit(reservation.id)
											}
											className="text-blue-700 hover:underline text-sm text-left"
										>
											Edit reservation
										</button>
										<button
											onClick={() =>
												handleDelete(reservation.id)
											}
											className="text-blue-700 hover:underline text-sm text-left"
										>
											Delete reservation
										</button>
										<button
											onClick={() =>
												handleSendReminder(
													reservation.id,
												)
											}
											className="text-blue-700 hover:underline text-sm text-left"
										>
											Send Reminder
										</button>
									</div>

									{/* Right: Reservation Details */}
									<div>
										<div className="space-y-3 text-sm">
											<div>
												<p className="text-slate-500">
													Location
												</p>
												<p className="text-slate-800">
													{reservation.location}
												</p>
											</div>
											<div>
												<p className="text-slate-500">
													Date
												</p>
												<p className="text-slate-800">
													{formatDate(
														reservation.date,
													)}
												</p>
											</div>
											<div>
												<p className="text-slate-500">
													Time
												</p>
												<p className="text-slate-800">
													{reservation.time}
												</p>
											</div>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Calendar View */}
			{showCalendar && (
				<div className="border border-slate-300 rounded-lg p-4">
					<div className="mb-4">
						<div className="mb-4">
							<h3 className="font-semibold text-slate-800 mb-3">
								{editingReservationId
									? "Edit Reservation"
									: "Add a New Reservation"}
							</h3>
							{!editingReservationId && (
								<label className="block text-sm font-medium text-slate-700 mb-2">
									Select location
								</label>
							)}
							{!editingReservationId && (
								<select
									value={selectedLocation}
									onChange={(e) =>
										setSelectedLocation(e.target.value)
									}
									className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
								>
									{OFFICE_LOCATIONS.map((location) => (
										<option key={location} value={location}>
											{location}
										</option>
									))}
								</select>
							)}
						</div>
						<div className="flex items-center justify-between mb-4">
							<button
								onClick={handlePreviousWeek}
								className="px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-700 hover:bg-slate-50"
							>
								← Previous Week
							</button>
							<h3 className="font-semibold text-slate-800">
								{editingReservationId ? "Edit for " : ""}
								{selectedLocation}
							</h3>
							<button
								onClick={handleNextWeek}
								className="px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-700 hover:bg-slate-50"
							>
								Next Week →
							</button>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full border-collapse">
								<thead>
									<tr>
										<th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left text-sm text-slate-700">
											Time Slot
										</th>
										{timeSlots.map((slot) => (
											<th
												key={slot.date}
												className="border border-slate-300 bg-slate-100 px-3 py-2 text-center text-sm text-slate-700"
											>
												{slot.day}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{/* Morning Row */}
									<tr>
										<td className="border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
											Morning (8am-12pm)
										</td>
										{timeSlots.map((slot) => (
											<td
												key={`${slot.date}-morning`}
												className="border border-slate-300 p-2"
											>
												<button
													onClick={() =>
														handleSelectTimeSlot(
															slot,
															"Morning",
														)
													}
													disabled={!slot.morning}
													className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
														slot.morning
															? "bg-green-200 hover:bg-green-300 cursor-pointer"
															: "bg-pink-200 cursor-not-allowed opacity-50"
													}`}
												>
													{slot.morning
														? "Available"
														: "Booked"}
												</button>
											</td>
										))}
									</tr>

									{/* Afternoon Row */}
									<tr>
										<td className="border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
											Afternoon (12pm-5pm)
										</td>
										{timeSlots.map((slot) => (
											<td
												key={`${slot.date}-afternoon`}
												className="border border-slate-300 p-2"
											>
												<button
													onClick={() =>
														handleSelectTimeSlot(
															slot,
															"Afternoon",
														)
													}
													disabled={!slot.afternoon}
													className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
														slot.afternoon
															? "bg-green-200 hover:bg-green-300 cursor-pointer"
															: "bg-pink-200 cursor-not-allowed opacity-50"
													}`}
												>
													{slot.afternoon
														? "Available"
														: "Booked"}
												</button>
											</td>
										))}
									</tr>
								</tbody>
							</table>
						</div>
					</div>
					<div className="flex gap-3 mt-4">
						<button
							onClick={() => {
								setShowCalendar(false);
								setEditingReservationId(null);
							}}
							className="px-4 py-2 border border-slate-300 rounded-md text-sm text-slate-700 hover:bg-slate-50"
						>
							Done
						</button>
					</div>
				</div>
			)}

			{/* Make/Add Reservation Button */}
			{!showCalendar && (
				<button
					onClick={() => {
						setEditingReservationId(null);
						setShowCalendar(true);
					}}
					className="px-4 py-2 bg-blue-700 text-white rounded-md text-sm hover:bg-blue-800"
				>
					{reservations.length > 0
						? "+ Add Another Reservation"
						: "+ Make a Reservation"}
				</button>
			)}
		</section>
	);
}
