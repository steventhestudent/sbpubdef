import * as React from "react";
import { mockRows } from "@components/cms/MockRows";
import { ContentTable } from "@components/cms/ContentTable";
import { AnnouncementsApi } from "@api/announcements";

export function AnnouncementsManager({
	sites,
	query,
	selectionMode,
	selectedIds,
	onToggleSelect,
	announcementsApi,
}: {
	sites: string[];
	query: string;
	selectionMode: boolean;
	selectedIds: string[];
	onToggleSelect: (id: string) => void;
	announcementsApi: AnnouncementsApi;
}): JSX.Element {
	const items = mockRows("ANN", 6);

	React.useEffect(() => {
		setTimeout(async () => {
			const data = await announcementsApi.getAnnouncements(12);
			/*
				const items = await announcementsApi.getAnnouncements(12, {
				  targetSites: ["/sites/Attorney"],  // or omit for current site
				  department: "PD-Intranet",
				  // departmentMp: "Dept",           // add after you map search managed property
				  enforcePdCt: true                  // keep true if your CMS sets the CT
				});
			*/
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
