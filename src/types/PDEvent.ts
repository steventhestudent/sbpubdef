export interface ISharePointEventItem {
	Id: number;
	Title: string;
	EventDate: string;
	Location?: string;
}

export interface IEventItem {
	Id: string | number;
	Title: string;
	EventDate: string;
	Location: string;
	DetailsUrl: string;
}

export interface IGraphGroup {
	displayName: string;
	id: string;
}

export interface IGraphEvent {
	id: string;
	subject: string;
	start: { dateTime: string; timeZone: string };
	end: { dateTime: string; timeZone: string };
	location?: { displayName?: string };
	webLink?: string;
}

export type PDEvent = {
	id?: number;
	title: string;
	date?: string; // ISO string; you can change to Date if you prefer
	endDate?: string; // optional
	location?: string;
	detailsUrl?: string;
	siteUrl?: string;
	PDDepartment?: string;
};
