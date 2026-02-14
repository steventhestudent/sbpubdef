// --- Types ---
export interface ICase {
	number: string; // Maps to CaseNumber
}

export interface IAttorney {
	name: string; // Maps to Name from AttorneyLocationTemp
	cases: ICase[];
}

export interface ICaseType {
	type: string; // Maps to CaseType
	attorneys: IAttorney[];
}

export interface ICountyData {
	name: string; // Maps to Location
	caseTypes: ICaseType[];
}

// --- Props Interface ---
export interface IAttorneyWorkloadProps {
	counties: ICountyData[];
}
