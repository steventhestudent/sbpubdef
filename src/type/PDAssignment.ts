// import type { IList } from "@pnp/sp/lists";
import { ISearchResult } from "@pnp/sp/search";

export type PDAssignment = {
	id: number | string;
	title: string;
	// url?: string;
	// dueDate?: Date;
	PDDepartment?: string;
	// siteUrl?: string;
	status?: string;
	// assignedTo?: string;

	caseNumber?: string;
	client?: string;
	court?: string;
	nextHearing?: string | undefined;
	link?: string | undefined;
	attorneyEmail?: string;
	attorneyName?: string;
};

export type ListResult = ISearchResult & {
	// FileRef?: string;
	Id: number;
	Title: string;
	Client: string;
	Court: string;
	NextHearing?: string;
	Status: string;
	Link?: ISharePointLink | string;
	AssignedAttorney_x002f_Team?: ISharePointPerson | ISharePointPerson[];
	PD_x0020_Department?: string;
	PDDepartment?: string;
};

/*
 * IAttorneyAssignmentsProps.ts
 * */

export interface IAttorneyAssignmentsWebPartProps {
	listName: string;
	visibleToGroups: string;
}

export interface ISharePointPerson {
	Id: number;
	Title: string;
	EMail: string;
}

export interface ISharePointLink {
	Url: string;
	Description?: string;
}

export interface ISharePointListItem {
	Id: number;
	Title: string;
	Client: string;
	Court: string;
	NextHearing?: string;
	Status: string;
	Link?: ISharePointLink | string;
	AssignedAttorney_x002f_Team?: ISharePointPerson | ISharePointPerson[];
}

export interface ISharePointListResponse {
	value: ISharePointListItem[];
}

export interface IAttorneyAssignment {
	id?: number;
	caseNumber?: string;
	client?: string;
	court?: string;
	nextHearing?: string | undefined;
	status?: string;
	link?: string | undefined;
	attorneyEmail?: string;
	attorneyName?: string;
	isMyCase?: boolean;
}
