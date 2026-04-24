export type ContentTypeKey =
	| "announcement"
	| "procedureChecklist"
	| "pdEvent"
	| "assignment"
	| "banner"
	| "assignmentCatalog";

export type AudienceEntry =
	| { kind: "role"; roleKey: string; label: string }
	| { kind: "user"; email: string; label: string };

