export interface EventResult {
	Id: string | number;
	Title: string;
	EventDate: string;
	Location: string;
	DetailsUrl: string;
	EndDate: string;
	SiteUrl: string;
	PD_x0020_Department?: string;
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
