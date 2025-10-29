import * as React from "react";
import { mockRows } from "@components/cms/MockRows";
import { ContentTable } from "@components/cms/ContentTable";

export function AnnouncementsManager({
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
	const items = mockRows("ANN", 6);
	console.log(`yo mama`);
	return (
		<ContentTable
			kind="Announcement"
			items={items}
			sites={sites}
			query={query}
			selectionMode={selectionMode}
			selectedIds={selectedIds}
			onToggleSelect={onToggleSelect}
		/>
	);
}
