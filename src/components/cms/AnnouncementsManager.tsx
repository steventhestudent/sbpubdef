import * as React from "react";
import { mockRows } from "@components/cms/MockRows";
import { ContentTable } from "@components/cms/ContentTable";
import { PNPWrapper } from "@utils/PNPWrapper";
import { AnnouncementsApi } from "@api/announcements";

export function AnnouncementsManager({
	sites,
	query,
	selectionMode,
	selectedIds,
	onToggleSelect,
	pnpWrapper,
}: {
	sites: string[];
	query: string;
	selectionMode: boolean;
	selectedIds: string[];
	onToggleSelect: (id: string) => void;
	pnpWrapper: PNPWrapper;
}): JSX.Element {
	const items = mockRows("ANN", 6);

	const announcementsApi = new AnnouncementsApi(pnpWrapper);
	React.useEffect(() => {
		setTimeout(async () => {
			const data = await announcementsApi.getAnnouncements(12);
			console.log("announcements: ", data);
		});
	}, []);

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
