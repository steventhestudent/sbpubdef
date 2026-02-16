import { WebPartContext } from "@microsoft/sp-webpart-base";
import { spfi, SPFx } from "@pnp/sp";
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
  TimeBlock: string;
  UserEmail: string;
}

export class HotelingService {
  private sp: ReturnType<typeof spfi>;
  private listName = "HotelingReservations";

  constructor(context: WebPartContext) {
    this.sp = spfi().using(SPFx(context));
  }

  // Create a new reservation
  public async createReservation(reservation: IReservation): Promise<void> {
    // Get the user ID first
    const user = await this.sp.web.ensureUser(reservation.UserEmail);
    
    await this.sp.web.lists.getByTitle(this.listName).items.add({
      Title: `${reservation.Location} - ${reservation.Desk} - ${reservation.TimeBlock}`,
      Location: reservation.Location,
      Desk: reservation.Desk,
      ReservationDate: reservation.ReservationDate.toISOString(),
      TimeBlock: reservation.TimeBlock,
      UserEmailId: user.Id,
    });
  }

  // Get all reservations for current user
  public async getMyReservations(userEmail: string): Promise<IReservation[]> {
    const items = await this.sp.web.lists
      .getByTitle(this.listName)
      .items.select("Id", "Title", "Location", "Desk", "ReservationDate", "TimeBlock", "UserEmail/EMail")
      .expand("UserEmail")
      .filter(`UserEmail/EMail eq '${userEmail}'`)();

    return items.map(item => ({
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
    await this.sp.web.lists.getByTitle(this.listName).items.getById(id).delete();
  }

  // Get all reservations (for checking conflicts)
  public async getAllReservations(): Promise<IReservation[]> {
    const items = await this.sp.web.lists
      .getByTitle(this.listName)
      .items.select("Id", "Title", "Location", "Desk", "ReservationDate", "TimeBlock", "UserEmail/EMail")
      .expand("UserEmail")();
    
    return items.map(item => ({
      Id: item.Id,
      Title: item.Title,
      Location: item.Location,
      Desk: item.Desk,
      ReservationDate: new Date(item.ReservationDate),
      TimeBlock: item.TimeBlock,
      UserEmail: item.UserEmail?.EMail || "",
    }));
  }

  // Check if a specific slot is available
  public async isSlotAvailable(
    location: string,
    desk: string,
    date: Date,
    timeBlock: string
  ): Promise<boolean> {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const items = await this.sp.web.lists
      .getByTitle(this.listName)
      .items.filter(
        `Location eq '${location}' and Desk eq '${desk}' and ReservationDate eq datetime'${dateStr}' and TimeBlock eq '${timeBlock}'`
      )();

    return items.length === 0;
  }
}