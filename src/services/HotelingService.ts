import { WebPartContext } from "@microsoft/sp-webpart-base";
import { spfi, SPFx, SPFI } from "@pnp/sp";

import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/site-users/web";

export interface IReservation {
	Id?: number;
	ID?: number;
	Title?: string;
	Location: string;
	Desk: string;
	ReservationDate: Date;
	TimeBlock: string;
	UserEmail?: { EMail?: string } | string;
	data?: { Id?: number; ID?: number };
}

export class HotelingService {
	private sp: SPFI;
	private listName = "HotelingReservations";

	constructor(context: WebPartContext) {
		this.sp = spfi().using(SPFx(context));
	}

	// Create a new reservation (returns created item id)
	public async createReservation(reservation: IReservation): Promise<number> {
		const user = await this.sp.web.ensureUser(
			reservation.UserEmail as string,
		);

		const result: IReservation = await this.sp.web.lists
			.getByTitle(this.listName)
			.items.add({
				Title: `${reservation.Location} - ${reservation.Desk} - ${reservation.TimeBlock}`,
				Location: reservation.Location,
				Desk: reservation.Desk,
				ReservationDate: reservation.ReservationDate.toISOString(),
				TimeBlock: reservation.TimeBlock,
				UserEmailId: user.Id,
			});

		return Number(
			result?.Id ??
				result?.data?.Id ??
				result?.data?.ID ??
				result?.ID ??
				0,
		);
	}

	// helper to escape single quotes for OData
	private escapeODataString(value: string): string {
		return value.replace(/'/g, "''");
	}

	// Get all reservations for current user
	public async getMyReservations(userEmail: string): Promise<IReservation[]> {
		const safeEmail = this.escapeODataString(userEmail);

		const items = await this.sp.web.lists
			.getByTitle(this.listName)
			.items.select(
				"Id",
				"Title",
				"Location",
				"Desk",
				"ReservationDate",
				"TimeBlock",
				"UserEmail/EMail",
			)
			.expand("UserEmail")
			.filter(`UserEmail/EMail eq '${safeEmail}'`)();

		return items.map((item: IReservation) => ({
			Id: item.Id,
			Title: item.Title,
			Location: item.Location,
			Desk: item.Desk,
			ReservationDate: new Date(item.ReservationDate),
			TimeBlock: item.TimeBlock,
			UserEmail:
				item.UserEmail && typeof item.UserEmail === "object"
					? item.UserEmail.EMail
					: item.UserEmail || userEmail,
		}));
	}

	public async getAllReservations(): Promise<IReservation[]> {
		const items = await this.sp.web.lists
			.getByTitle(this.listName)
			.items.select(
				"Id",
				"Title",
				"Location",
				"Desk",
				"ReservationDate",
				"TimeBlock",
				"UserEmail/EMail",
			)
			.expand("UserEmail")();

		return items.map((item: IReservation) => ({
			Id: item.Id,
			Title: item.Title,
			Location: item.Location,
			Desk: item.Desk,
			ReservationDate: new Date(item.ReservationDate),
			TimeBlock: item.TimeBlock,
			UserEmail:
				item.UserEmail && typeof item.UserEmail === "object"
					? item.UserEmail.EMail
					: item.UserEmail || "",
		}));
	}

	// Delete a reservation
	public async deleteReservation(id: number): Promise<void> {
		await this.sp.web.lists
			.getByTitle(this.listName)
			.items.getById(id)
			.delete();
	}

	// Check if a specific slot is available
	public async isSlotAvailable(
		location: string,
		desk: string,
		date: Date,
		timeBlock: string,
	): Promise<boolean> {
		const start = new Date(date);
		start.setHours(0, 0, 0, 0);
		const end = new Date(start);
		end.setDate(end.getDate() + 1);

		const safeLocation = this.escapeODataString(location);
		const safeDesk = this.escapeODataString(desk);
		const safeTimeBlock = this.escapeODataString(timeBlock);

		const startIso = start.toISOString();
		const endIso = end.toISOString();

		const items = await this.sp.web.lists
			.getByTitle(this.listName)
			.items.filter(
				`Location eq '${safeLocation}' and Desk eq '${safeDesk}' and ReservationDate ge datetime'${startIso}' and ReservationDate lt datetime'${endIso}' and TimeBlock eq '${safeTimeBlock}'`,
			)();

		return items.length === 0;
	}

	// public async getReservationById(
	// 	id: number,
	// ): Promise<IReservation | undefined> {
	// 	const item: any = await this.sp.web.lists
	// 		.getByTitle(this.listName)
	// 		.items.getById(id)
	// 		.select(
	// 			"Id",
	// 			"Title",
	// 			"Location",
	// 			"Desk",
	// 			"ReservationDate",
	// 			"TimeBlock",
	// 			"UserEmail/EMail",
	// 		)
	// 		.expand("UserEmail")();
	//
	// 	if (!item) return undefined;
	//
	// 	return {
	// 		Id: item.Id,
	// 		Title: item.Title,
	// 		Location: item.Location,
	// 		Desk: item.Desk,
	// 		ReservationDate: new Date(item.ReservationDate),
	// 		TimeBlock: item.TimeBlock,
	// 		UserEmail: item.UserEmail?.EMail || "",
	// 	};
	// }

	public async updateReservation(
		id: number,
		changes: Partial<IReservation>,
	): Promise<void> {
		const payload: Partial<IReservationSave> = {};
		if (changes.Location !== undefined) payload.Location = changes.Location;
		if (changes.Desk !== undefined) payload.Desk = changes.Desk;
		if (changes.ReservationDate !== undefined)
			payload.ReservationDate = changes.ReservationDate.toISOString();
		if (changes.TimeBlock !== undefined)
			payload.TimeBlock = changes.TimeBlock;

		await this.sp.web.lists
			.getByTitle(this.listName)
			.items.getById(id)
			.update(payload);
	}
}

type Override<T, U> = Omit<T, keyof U> & U;
type IReservationSave = Override<IReservation, { ReservationDate: string }>;
