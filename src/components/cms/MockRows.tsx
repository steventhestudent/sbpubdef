import type { ContentRow } from "@type/cms/ContentRow";

export function mockRows(
	prefix: string,
	n: number,
	opts?: {
		includeWhen?: boolean;
		includeOwner?: boolean;
		includeStatus?: boolean;
	},
): ContentRow[] {
	return Array.from({ length: n }).map((_, i) => ({
		id: `${prefix}-${i + 1}`,
		title: `Placeholder ${prefix} Title ${i + 1}`,
		subtitle: "Short description lorem ipsum dolor sit amet.",
		site: i % 2 === 0 ? "/sites/PD-Intranet" : "/sites/PD-Another",
		when: opts?.includeWhen ? `Nov ${i + 3}, 2025` : "—",
		owner: opts?.includeOwner ? "you@county.gov" : "—",
		status: (opts?.includeStatus
			? ["Draft", "Scheduled", "Published"][i % 3]
			: i % 2
				? "Published"
				: "Draft") as ContentRow["status"],
	}));
}
