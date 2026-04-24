export type EventResult = Record<string, string | undefined> & {
	Id: number;
	Title: string;
	EventDate: string;
	Location: string;
	DetailsUrl: string;
	EndDate: string;
	SiteUrl: string;
};

export type PDEvent = {
	id: number;
	title: string;
	date?: string; // ISO string; you can change to Date if you prefer
	endDate?: string; // optional
	/** SharePoint `fAllDayEvent` or Graph `isAllDay` — avoids UTC midnight shifting the calendar day. */
	allDay?: boolean;
	location?: string;
	detailsUrl?: string;
	siteUrl?: string;
	PDDepartment?: string;
	author?: string;
};
