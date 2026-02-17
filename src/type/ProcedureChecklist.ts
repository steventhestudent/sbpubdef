export interface ListResult {
	Id: number;
	Title?: string;
	Category?: string;
	Filename?: string;
	EffectiveDate?: string;
	PageCount?: number;
	json?: string;
	DocumentURL?: string;
}

export type ProcedureChecklistSublist = {
	list_page_range: [number, number];
	list_txt: string;
	associated_images: string[];
};

export type ProcedureChecklistParsedJSON = {
	category: string;
	filename: string;
	title: string;
	effectiveDate: string;
	purpose: string;
	versionHistory: { raw: string }[];
	pageCount: number;
	documentURL: string;
	lists: ProcedureChecklistSublist[];
};

export interface ProcedureChecklistItem {
	id: number;
	title: string;
	category: string;
	filename: string;
	effectiveDate: string;
	pageCount: number;
	json: string;
	documentURL: string;
	obj?: ProcedureChecklistParsedJSON;
}
