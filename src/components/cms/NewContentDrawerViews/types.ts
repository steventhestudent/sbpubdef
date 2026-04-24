export type ContentTypeKey =
	| "announcement"
	| "procedureChecklist"
	| "pdEvent"
	| "assignment";

export type AudienceEntry =
	| { kind: "role"; roleKey: string; label: string }
	| { kind: "user"; email: string; label: string };

