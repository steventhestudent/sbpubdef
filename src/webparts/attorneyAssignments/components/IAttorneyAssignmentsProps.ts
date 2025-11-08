export interface IAttorneyAssignmentsProps {
	assignments: IAssignment[];
	visibleToGroups?: string[];
}

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

export interface IAssignment {
	id: number;
	caseNumber: string;
	client: string;
	court: string;
	nextHearing: string | undefined;
	status: string;
	link: string | undefined;
	attorneyEmail: string;
	attorneyName: string;
	isMyCase: boolean;
}

export interface IGraphGroup {
	id: string;
	displayName: string;
}
