// ────────────────────────────────────────────────────────────────────────────────
// Mock data helpers (replace with REST/Graph/SP queries later)
// ────────────────────────────────────────────────────────────────────────────────
export interface ContentRow {
	id: string;
	title: string;
	subtitle?: string;
	site: string;
	when: string;
	owner: string;
	status: "Draft" | "Scheduled" | "Published" | "Archived" | "Error" | string;
}
