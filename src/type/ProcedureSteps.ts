// @type/ProcedureSteps.ts

// If you want strict typing for list results:
export type ProcedureStepsListResult = Record<string, unknown> & {
	Id?: number;
	Title?: string;
	Step?: number;
	Text?: string;
	Images?: string;

	// Lookup expansion shape depends on your list + select/expand; keep loose unless you need it:
	ProcedureIdId?: number; // REST: internal name ProcedureId + Id
	ProcedureIDId?: number; // legacy typo casing in some responses
	ProcedureId?: { Id?: number };
};

export type ProcedureStepItem = ProcedureStepsListResult & {
	id: number;
	title: string;
	procedureId?: number; // lookup id (optional; depends what you select)
	procedureFilename?: string; // optional, if you select lookup Title or extra field
	step: number;
	text: string;
	images: string; // multiline text; treat as "best image url" (or blank)
};
