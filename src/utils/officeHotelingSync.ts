export interface OfficeHotelingReservation {
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

export const HOTELING_SYNC_EVENT = "office-hoteling-sync";
const HOTELING_STORAGE_KEY = "sbpubdef-office-hoteling-reservations";
const HOTELING_DEBUG_SESSION_KEY = "sbpubdef-office-hoteling-debug-reset-done";

const canUseStorage = (): boolean =>
	typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const isDebugSession = (): boolean => {
	if (typeof window === "undefined") {
		return false;
	}

	const { search, hostname } = window.location;
	return (
		hostname === "localhost" ||
		search.includes("debug=true") ||
		search.includes("debugManifestsFile=")
	);
};

const ensureDebugSessionBaseline = (): void => {
	if (!canUseStorage() || typeof window === "undefined") {
		return;
	}

	if (!isDebugSession()) {
		return;
	}

	try {
		if (window.sessionStorage.getItem(HOTELING_DEBUG_SESSION_KEY) === "1") {
			return;
		}

		window.localStorage.removeItem(HOTELING_STORAGE_KEY);
		window.sessionStorage.setItem(HOTELING_DEBUG_SESSION_KEY, "1");
		window.dispatchEvent(new CustomEvent(HOTELING_SYNC_EVENT));
	} catch (error) {
		console.warn("Failed to initialize hoteling debug session baseline.", error);
	}
};

export const readHotelingReservations = (): OfficeHotelingReservation[] => {
	if (!canUseStorage()) {
		return [];
	}

	ensureDebugSessionBaseline();

	try {
		const raw = window.localStorage.getItem(HOTELING_STORAGE_KEY);
		if (!raw) {
			return [];
		}

		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed.filter((item): item is OfficeHotelingReservation => {
			if (!item || typeof item !== "object") return false;
			const reservation = item as Partial<OfficeHotelingReservation>;
			return (
				typeof reservation.id === "string" &&
				typeof reservation.location === "string" &&
				typeof reservation.date === "string" &&
				(reservation.time === "Morning" || reservation.time === "Afternoon") &&
				(reservation.outlookEventId === undefined || typeof reservation.outlookEventId === "string") &&
				(reservation.outlookEventWebLink === undefined || typeof reservation.outlookEventWebLink === "string") &&
				(reservation.sharePointEventId === undefined || typeof reservation.sharePointEventId === "number") &&
				(reservation.sharePointEventWebLink === undefined || typeof reservation.sharePointEventWebLink === "string")
			);
		});
	} catch (error) {
		console.warn("Failed to read hoteling reservations from storage.", error);
		return [];
	}
};

export const writeHotelingReservations = (
	reservations: OfficeHotelingReservation[],
): void => {
	if (!canUseStorage()) {
		return;
	}

	try {
		window.localStorage.setItem(HOTELING_STORAGE_KEY, JSON.stringify(reservations));
		window.dispatchEvent(new CustomEvent(HOTELING_SYNC_EVENT));
	} catch (error) {
		console.warn("Failed to write hoteling reservations to storage.", error);
	}
};

export const clearHotelingReservations = (): void => {
	if (!canUseStorage()) {
		return;
	}

	try {
		window.localStorage.removeItem(HOTELING_STORAGE_KEY);
		window.dispatchEvent(new CustomEvent(HOTELING_SYNC_EVENT));
	} catch (error) {
		console.warn("Failed to clear hoteling reservations from storage.", error);
	}
};
