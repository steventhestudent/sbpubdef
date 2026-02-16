import * as React from "react";
import type { IOfficeHotelingProps } from "./IOfficeHotelingProps";
import { offices } from "../../../webparts/officeInformation/components/Offices";

interface Reservation {
	id: string;
	location: string;
	date: string;
	time: "Morning" | "Afternoon";
	desk?: string;
}

interface TimeSlot {
	day: string;
	date: string;
	morning: boolean;
	afternoon: boolean;
	isHoliday?: boolean;
}

const OFFICE_LOCATIONS = offices.map(office => office.name);

// A small list of public holidays (YYYY-MM-DD). Update as needed.
// Common US federal/public holidays for 2026 (adjust as needed)
const PUBLIC_HOLIDAYS = new Set<string>([
	"2026-01-01", // New Year's Day
	"2026-01-19", // Martin Luther King Jr. Day
	"2026-02-16", // Washington's Birthday / Presidents' Day
	"2026-05-25", // Memorial Day
	"2026-06-19", // Juneteenth
	"2026-07-04", // Independence Day
	"2026-09-07", // Labor Day
	"2026-11-26", // Thanksgiving Day
	"2026-12-25", // Christmas Day
]);

// Generate time slots for the calendar. Weekends and public holidays are not available.
// bookedSlots keys format: YYYY-MM-DD-morning or YYYY-MM-DD-afternoon (desk-agnostic)
const generateTimeSlots = (startDate: Date, bookedSlots: Set<string>, desk?: string): TimeSlot[] => {
	const slots: TimeSlot[] = [];
	const current = new Date(startDate);

	// Generate 21 days (3 weeks)
	for (let i = 0; i < 21; i++) {
		// Skip Saturdays (6) and Sundays (0) - only weekdays
		if (current.getDay() !== 0 && current.getDay() !== 6) {
			// Create date string in local timezone (YYYY-MM-DD) to match PUBLIC_HOLIDAYS format
			const year = current.getFullYear();
			const month = String(current.getMonth() + 1).padStart(2, '0');
			const day = String(current.getDate()).padStart(2, '0');
			const dateStr = `${year}-${month}-${day}`;

			const dayName = current.toLocaleDateString("en-US", {
				weekday: "short",
				month: "numeric",
				day: "numeric",
				year: "2-digit",
			});

			const isHoliday = PUBLIC_HOLIDAYS.has(dateStr);

			const morningKey = `${dateStr}-morning`;
			const afternoonKey = `${dateStr}-afternoon`;

			slots.push({
				day: dayName,
				date: dateStr,
				morning: !isHoliday && !bookedSlots.has(morningKey),
				afternoon: !isHoliday && !bookedSlots.has(afternoonKey),
				isHoliday,
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
	const [selectedDesk, setSelectedDesk] = React.useState<string>('Desk 1');
	const [reservations, setReservations] = React.useState<Reservation[]>([]);
	const [editingReservationId, setEditingReservationId] = React.useState<string | null>(null);
	// viewMode: 'my' = My Reservations page, 'add' = Add reservation (calendar)
	const [viewMode, setViewMode] = React.useState<'my' | 'add'>('my');
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
	const [bookedSlots, setBookedSlots] = React.useState<Set<string>>(new Set());
	// Pending reservation for confirm modal
	const [pendingReservation, setPendingReservation] = React.useState<Reservation | null>(null);
	// Pending deletion for delete confirmation modal
	const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
	// Show limit reached modal
	const [showLimitModal, setShowLimitModal] = React.useState<boolean>(false);
	// index of currently viewed reservation in the My Reservations view
	const [currentReservationIndex, setCurrentReservationIndex] = React.useState<number>(0);

	// Ensure bookedSlots reflects current reservations across ALL locations
	// A time slot is booked if ANY reservation exists at that time, because you can't be in multiple places at once
	React.useEffect(() => {
		const setSlots = new Set<string>();
		reservations.forEach(r => {
			setSlots.add(`${r.date}-${r.time.toLowerCase()}`);
		});
		setBookedSlots(setSlots);

		// clamp currentReservationIndex when reservations change
		setCurrentReservationIndex(prev => {
			const maxIndex = Math.max(0, reservations.length - 1);
			return Math.min(prev, maxIndex);
		});
	}, [reservations]);

	const timeSlots = generateTimeSlots(weekStartDate, bookedSlots, selectedDesk).slice(0, 5); // Show 5 business days (Monday-Friday)
    
	// Enforce calendar window (3 weeks ahead)
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const maxDate = new Date(today);
	maxDate.setDate(maxDate.getDate() + 20); // 3 weeks ahead (21 days inclusive)

	const handleEdit = (reservationId: string): void => {
		const res = reservations.find(r => r.id === reservationId);
		if (!res) {
			console.warn('Error: Reservation not found.');
			return;
		}

		// prevent editing within 24 hours (parse date string to avoid timezone issues)
		const [year, month, day] = res.date.split('-').map(Number);
		const resDate = new Date(year, month - 1, day, 0, 0, 0, 0);
		const now = new Date();
		const hoursUntilReservation = (resDate.getTime() - now.getTime()) / (1000 * 60 * 60);
		
		if (hoursUntilReservation < 24) {
			console.warn('Reservations may only be edited up to 24 hours before the reserved date.');
			return;
		}

		// prefill location/desk and set calendar to include the date
		setSelectedLocation(res.location);
		if (res.desk) setSelectedDesk(res.desk);
		setWeekStartDate(resDate);
		setEditingReservationId(reservationId);
		setViewMode('add');
		setShowCalendar(true);
	};

	const handleDelete = (reservationId: string): void => {
		console.log('=== DELETE INITIATED ===');
		console.log('Setting pending delete ID:', reservationId);
		setPendingDeleteId(reservationId);
	};

	const handleConfirmDelete = (confirmed: boolean): void => {
		console.log('Delete confirmation:', confirmed);
		
		if (!confirmed || !pendingDeleteId) {
			setPendingDeleteId(null);
			return;
		}

		const newReservations = reservations.filter(r => r.id !== pendingDeleteId);
		console.log('Deleting reservation ID:', pendingDeleteId);
		console.log('New count:', newReservations.length);
		
		setReservations(newReservations);
		setPendingDeleteId(null);
		setEditingReservationId(null);
		setShowCalendar(false);
		setViewMode('my');
		console.log('Reservation deleted.');
	};

	const handleSendReminder = (reservationId: string): void => {
		console.log('Reminder sent to your email');
	};

	const handleSelectTimeSlot = (slot: TimeSlot, timeOfDay: "Morning" | "Afternoon"): void => {
		// If this user already has 3 reservations and is not editing, block creation
		if (!editingReservationId && reservations.length >= 3) {
			setShowLimitModal(true);
			return;
		}

		// Prepare pending reservation and show confirm modal (include desk)
		const newPending: Reservation = {
			id: editingReservationId ? editingReservationId : `res-${Date.now()}`,
			location: selectedLocation,
			date: slot.date,
			time: timeOfDay,
			desk: selectedDesk,
		};

		setPendingReservation(newPending);
	};

	const prevReservation = (): void => {
		setCurrentReservationIndex(i => Math.max(0, i - 1));
	};

	const nextReservation = (): void => {
		setCurrentReservationIndex(i => Math.min(reservations.length - 1, i + 1));
	};

	// Format date helper used in multiple places (parse YYYY-MM-DD without timezone issues)
	const formatDate = (dateStr: string): string => {
		const [year, month, day] = dateStr.split('-').map(Number);
		const date = new Date(year, month - 1, day);
		return date.toLocaleDateString("en-US", {
			weekday: "short",
			month: "long",
			day: "numeric",
			year: "numeric",
		});
	};

	const handleConfirmReservation = (confirmed: boolean): void => {
		if (!confirmed) {
			setPendingReservation(null);
			return;
		}

		if (!pendingReservation) return;

		if (editingReservationId) {
			// update
			const oldReservation = reservations.find(r => r.id === editingReservationId);
			if (oldReservation) {
				const oldSlotKey = `${oldReservation.date}-${oldReservation.time.toLowerCase()}`;
				const newBookedSlots = new Set(bookedSlots);
				newBookedSlots.delete(oldSlotKey);
				newBookedSlots.add(`${pendingReservation.date}-${pendingReservation.time.toLowerCase()}`);
				setBookedSlots(newBookedSlots);

				const newReservations = reservations.map(r =>
					r.id === editingReservationId
						? { ...r, location: pendingReservation.location, date: pendingReservation.date, time: pendingReservation.time, desk: pendingReservation.desk }
						: r
				);
				setReservations(newReservations);
			}
		} else {
			// create - enforce reservation limit as a final guard
			if (!editingReservationId && reservations.length >= 3) {
				setShowLimitModal(true);
				setPendingReservation(null);
				return;
			}
			const newBookedSlots = new Set(bookedSlots);
			newBookedSlots.add(`${pendingReservation.date}-${pendingReservation.time.toLowerCase()}`);
			setBookedSlots(newBookedSlots);
			setReservations([...reservations, pendingReservation]);

			// reservation created — use console log instead of browser alert
			console.log('Reservation created', pendingReservation);
		}

		setPendingReservation(null);
		setEditingReservationId(null);
		setShowCalendar(false);
		setViewMode('my');
	};

	const handlePreviousWeek = (): void => {
		const prev = new Date(weekStartDate);
		prev.setDate(prev.getDate() - 7);
		// Only go back if it's not earlier than today
		if (prev >= today) {
			setWeekStartDate(prev);
		}
	};

	const handleNextWeek = (): void => {
		const next = new Date(weekStartDate);
		next.setDate(next.getDate() + 7);
		// don't go beyond maxDate (3 weeks ahead)
		if (next <= maxDate) {
			setWeekStartDate(next);
		}
	};

	// Sort reservations by date (closest first) for My Reservations view
	const sortedReservations = [...reservations].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

	return (
		<section className="border border-[var(--webpart-border-color)] bg-[var(--webpart-bg-color)] shadow-sm p-6">
			<h2 className="text-xl font-semibold text-slate-800 mb-4">
				Hoteling
			</h2>
			{/* Top Controls */}
			<div className="mb-4 flex gap-3">
				<button
					className={`px-3 py-2 border border-slate-300 rounded text-sm font-medium transition-colors ${
						viewMode === 'my' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
					}`}
					onClick={(e) => { e.stopPropagation(); setViewMode('my'); setShowCalendar(false); }}
				>
					My Reservations
				</button>
				<button
					className={`px-3 py-2 border border-slate-300 rounded text-sm font-medium transition-colors ${
						viewMode === 'add' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
					}`}
					onClick={(e) => { e.stopPropagation(); setViewMode('add'); setShowCalendar(true); setEditingReservationId(null); }}
				>
					Add Reservation
				</button>
			</div>

			{/* My Reservations Section (separate page) */}
			{viewMode === 'my' && (
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
										<p className="text-sm text-slate-500">Reservation {currentReservationIndex + 1} of {sortedReservations.length}</p>
										<p className="text-slate-800 font-medium">{formatDate(sortedReservations[currentReservationIndex].date)}</p>
										<p className="text-slate-500 text-sm">{sortedReservations[currentReservationIndex].time} — {sortedReservations[currentReservationIndex].desk}</p>
									</div>
									<div className="flex items-center gap-3">
						<button onClick={(e) => { e.stopPropagation(); prevReservation(); }} disabled={currentReservationIndex === 0} className="px-3 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">&lt; Prev</button>
						<button onClick={(e) => { e.stopPropagation(); nextReservation(); }} disabled={currentReservationIndex >= sortedReservations.length - 1} className="px-3 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">Next &gt;</button>
									</div>
								</div>
								<div className="flex gap-4">
									<div className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded">
										<p className="text-slate-700 text-sm">Date</p>
										<p className="text-slate-900 font-semibold text-lg">{formatDate(sortedReservations[currentReservationIndex].date)}</p>
										<p className="text-slate-600 text-sm mt-2">Time: {sortedReservations[currentReservationIndex].time}</p>
									</div>
									<div className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded">
										<p className="text-slate-700 text-sm">Location</p>
										<p className="text-slate-900 font-semibold">{sortedReservations[currentReservationIndex].location}</p>
										<p className="text-slate-600 text-sm mt-2">{sortedReservations[currentReservationIndex].desk}</p>
										<div className="mt-4 flex flex-col items-end gap-2">
										<button onClick={(e) => { e.stopPropagation(); handleEdit(sortedReservations[currentReservationIndex].id); }} className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800">Edit</button>
										<button onClick={(e) => { e.stopPropagation(); handleDelete(sortedReservations[currentReservationIndex].id); }} className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800">Delete</button>
										<button onClick={(e) => { e.stopPropagation(); handleSendReminder(sortedReservations[currentReservationIndex].id); }} className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Send reminder</button>
										</div>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Calendar View */}
			{viewMode === 'add' && showCalendar && (
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
						<button onClick={(e) => { e.stopPropagation(); handlePreviousWeek(); }} className="px-3 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50">← Previous Week</button>
						<h3 className="font-semibold text-slate-800">{editingReservationId ? "Edit for " : ""}{selectedLocation}</h3>
						<button onClick={(e) => { e.stopPropagation(); handleNextWeek(); }} className="px-3 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50">Next Week →</button>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full border-collapse">
								<thead>
									<tr>
										<th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left text-sm text-slate-700">Time Slot</th>
										{timeSlots.map((slot) => (
											<th key={slot.date} className="border border-slate-300 bg-slate-100 px-3 py-2 text-center text-sm text-slate-700">{slot.day}{slot.isHoliday ? ' (Holiday)' : ''}</th>
										))}
									</tr>
								</thead>
								<tbody>
									{/* Morning Row */}
									<tr>
										<td className="border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">Morning (8am-12pm)</td>
										{timeSlots.map((slot) => (
											<td key={`${slot.date}-morning`} className="border border-slate-300 p-2">
												<button onClick={(e) => { e.stopPropagation(); handleSelectTimeSlot(slot, "Morning"); }} disabled={!slot.morning} className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${slot.isHoliday ? "bg-slate-200 text-slate-500 cursor-not-allowed" : slot.morning ? "bg-green-200 hover:bg-green-300 cursor-pointer" : "bg-pink-200 cursor-not-allowed opacity-50"}`}>
													{slot.isHoliday ? 'Holiday' : slot.morning ? "Available" : "Booked"}
												</button>
											</td>
										))}
									</tr>

									{/* Afternoon Row */}
									<tr>
										<td className="border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">Afternoon (12pm-5pm)</td>
										{timeSlots.map((slot) => (
											<td key={`${slot.date}-afternoon`} className="border border-slate-300 p-2">
												<button onClick={(e) => { e.stopPropagation(); handleSelectTimeSlot(slot, "Afternoon"); }} disabled={!slot.afternoon} className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${slot.isHoliday ? "bg-slate-200 text-slate-500 cursor-not-allowed" : slot.afternoon ? "bg-green-200 hover:bg-green-300 cursor-pointer" : "bg-pink-200 cursor-not-allowed opacity-50"}`}>
													{slot.isHoliday ? 'Holiday' : slot.afternoon ? "Available" : "Booked"}
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
							<button onClick={(e) => { e.stopPropagation(); setShowCalendar(false); setEditingReservationId(null); setViewMode('my'); }} className="px-4 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50">Back</button>
						)}
					</div>
				</div>
			)}

			{/* Confirmation modal */}
			{pendingReservation && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
					<div className="bg-white rounded-md p-6 w-[90%] max-w-xl">
						<h4 className="font-semibold mb-3">Confirm Reservation</h4>
						<p className="mb-2">Location: <b>{pendingReservation.location}</b></p>
						<p className="mb-2">Desk: <b>{pendingReservation.desk}</b></p>
						<p className="mb-2">Date: <b>{formatDate(pendingReservation.date)}</b></p>
						<p className="mb-4">Time: <b>{pendingReservation.time}</b></p>
						<div className="flex gap-3 justify-end">
							<button onClick={(e) => { e.stopPropagation(); handleConfirmReservation(false); }} className="px-3 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
							<button onClick={(e) => { e.stopPropagation(); handleConfirmReservation(true); }} className="px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">Confirm</button>
						</div>
					</div>
				</div>
			)}

			{/* Delete confirmation modal */}
			{pendingDeleteId && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
					<div className="bg-white rounded-md p-6 w-[90%] max-w-xl">
						<h4 className="font-semibold mb-3">Delete Reservation</h4>
						<p className="mb-4 text-slate-700">Are you sure you want to delete this reservation? This action cannot be undone.</p>
						<div className="flex gap-3 justify-end">
							<button onClick={(e) => { e.stopPropagation(); handleConfirmDelete(false); }} className="px-3 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
							<button onClick={(e) => { e.stopPropagation(); handleConfirmDelete(true); }} className="px-3 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700">Delete</button>
						</div>
					</div>
				</div>
			)}

			{/* Limit reached modal */}
			{showLimitModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
					<div className="bg-white rounded-md p-6 w-[90%] max-w-xl">
						<h4 className="font-semibold mb-3 text-red-600">Reservation Limit Reached</h4>
						<p className="mb-4 text-slate-700">You have reached the maximum of 3 active reservations. Please delete one before adding a new reservation.</p>
						<div className="flex gap-3 justify-end">
							<button onClick={(e) => { e.stopPropagation(); setShowLimitModal(false); }} className="px-3 py-2 bg-slate-600 text-white rounded text-sm font-medium hover:bg-slate-700">Close</button>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}
