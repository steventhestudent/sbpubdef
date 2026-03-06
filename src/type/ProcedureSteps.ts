// @type/ProcedureSteps.ts

export type ProcedureStepItem = {
	id: number;
	procedureId?: number; // lookup id (optional; depends what you select)
	procedureFilename?: string; // optional, if you select lookup Title or extra field
	step: number;
	text: string;
	images: string; // multiline text; treat as "best image url" (or blank)
};

// If you want strict typing for list results:
export type ProcedureStepsListResult = Record<string, unknown> & {
	Id: number;
	Step?: number;
	Text?: string;
	Images?: string;

	// Lookup expansion shape depends on your list + select/expand; keep loose unless you need it:
	ProcedureIDId?: number; // common pattern: <LookupInternalName>Id
};
