import * as React from "react";
import { mockRows } from "@components/cms/MockRows";
import { ContentTable } from "@components/cms/ContentTable";

export function TrainingsManager({
	sites,
	query,
}: {
	sites: string[];
	query: string;
}): JSX.Element {
	const items = mockRows("TRN", 4, { includeWhen: true });
	return (
		<ContentTable
			kind="Training"
			items={items}
			sites={sites}
			query={query}
		/>
	);
}
