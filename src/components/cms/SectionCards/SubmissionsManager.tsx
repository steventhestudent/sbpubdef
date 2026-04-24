import * as React from "react";
import { ContentTable } from "@components/cms/ContentTable";
import { mockRows } from "@components/cms/MockRows";

export function SubmissionsManager({
	sites,
	query,
}: {
	sites: string[];
	query: string;
}): JSX.Element {
	const items = mockRows("SUB", 10, {
		includeOwner: true,
		includeStatus: true,
	});
	return (
		<ContentTable
			kind="Submission"
			items={items}
			sites={sites}
			query={query}
		/>
	);
}
