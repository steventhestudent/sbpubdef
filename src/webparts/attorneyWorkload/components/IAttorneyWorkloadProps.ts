import { WebPartContext } from "@microsoft/sp-webpart-base";

export interface ICase {
	CaseID: string;
	CaseStatus: string;
}

export interface IAttorney {
	name: string;
	cases: ICase[];
}

export interface ICaseType {
	type: string;
	attorneys: IAttorney[];
}

export interface ILocationData {
	name: string;
	caseTypes: ICaseType[];
}

export interface IAttorneyWorkloadProps {
	context: WebPartContext;
}
