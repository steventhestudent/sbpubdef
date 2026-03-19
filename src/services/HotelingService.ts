import { WebPartContext } from "@microsoft/sp-webpart-base";
import { spfi, SPFI, SPFx } from "@pnp/sp";

import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/site-users/web";

export interface IReservation {
	Id?: number;
	Title?: string;
	Location: string;
	Desk: string;
	ReservationDate: Date;
	TimeBlock: string; // "Morning" | "Afternoon"
	UserEmail: string; // email string
}

export class HotelingService {
	private sp: SPFI;

constructor(context: WebPartContext) {
	this.sp = spfi(context.pageContext.web.absoluteUrl).using(SPFx(context));
}

	public async createReservation(reservation: IReservation): Promise<number> {
		const user = await this.sp.web.ensureUser(reservation.UserEmail);

		const result = await this.sp.web.lists
			.getByTitle(ENV.LIST_HOTELINGRESERVATIONS)
			.items.add({
				Title: `${reservation.Location} - ${reservation.Desk} - ${reservation.TimeBlock}`,
				Location: reservation.Location,
				Desk: reservation.Desk,
				ReservationDate: reservation.ReservationDate.toISOString(),
				TimeBlock: reservation.TimeBlock,
				UserEmailId: user.Id, // Person/Group lookup field
			});

		return result.Id;
	}

	// Get all reservations for current user
	public async getMyReservations(userEmail: string): Promise<IReservation[]> {
		const items = await this.sp.web.lists
			.getByTitle(ENV.LIST_HOTELINGRESERVATIONS)
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
			.filter(`UserEmail/EMail eq '${userEmail}'`)();

		return items.map((item) => ({
			Id: item.Id,
			Title: item.Title,
			Location: item.Location,
			Desk: item.Desk,
			ReservationDate: new Date(item.ReservationDate),
			TimeBlock: item.TimeBlock,
			UserEmail: item.UserEmail?.EMail || userEmail,
		}));
	}

	// Delete a reservation
	public async deleteReservation(id: number): Promise<void> {
		await this.sp.web.lists
			.getByTitle(ENV.LIST_HOTELINGRESERVATIONS)
			.items.getById(id)
			.delete();
	}

	// Get all reservations (for checking conflicts)
	public async getAllReservations(): Promise<IReservation[]> {
		const items = await this.sp.web.lists
			.getByTitle(ENV.LIST_HOTELINGRESERVATIONS)
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

		return items.map((item) => ({
			Id: item.Id,
			Title: item.Title,
			Location: item.Location,
			Desk: item.Desk,
			ReservationDate: new Date(item.ReservationDate),
			TimeBlock: item.TimeBlock,
			UserEmail: item.UserEmail?.EMail || "",
		}));
	}

	public async isSlotAvailable(
		location: string,
		desk: string,
		date: Date,
		timeBlock: string,
	): Promise<boolean> {
		// SharePoint filtering on DateTime -> this assumes ReservationDate is stored consistently
		//  use a day range filter to be safer.
		const start = new Date(date);
		start.setHours(0, 0, 0, 0);
		const end = new Date(date);
		end.setHours(23, 59, 59, 999);

		const startIso = start.toISOString();
		const endIso = end.toISOString();

		const items = await this.sp.web.lists
			.getByTitle(ENV.LIST_HOTELINGRESERVATIONS)
			.items.filter(
				`Location eq '${location}' and Desk eq '${desk}' and TimeBlock eq '${timeBlock}' and ReservationDate ge datetime'${startIso}' and ReservationDate le datetime'${endIso}'`,
			)();

		return items.length === 0;
	}
}
