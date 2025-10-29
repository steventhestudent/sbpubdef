import * as React from "react";
import { ContentTable } from "@components/cms/ContentTable";
import { mockRows } from "@components/cms/MockRows";

export function FormsManager({
	sites,
	query,
	selectionMode,
	selectedIds,
	onToggleSelect,
}: {
	sites: string[];
	query: string;
	selectionMode: boolean;
	selectedIds: string[];
	onToggleSelect: (id: string) => void;
}): JSX.Element {
	const items = mockRows("FRM", 8, { includeOwner: true });
	return (
		<ContentTable
			kind="Form"
			items={items}
			sites={sites}
			query={query}
			selectionMode={selectionMode}
			selectedIds={selectedIds}
			onToggleSelect={onToggleSelect}
		/>
	);
}
