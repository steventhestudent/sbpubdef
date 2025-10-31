import * as React from "react";
import { mockRows } from "@components/cms/MockRows";
import { ContentTable } from "@components/cms/ContentTable";
import { Announcement, AnnouncementsApi } from "@api/announcements";
import { ContentRow } from "@type/cms/ContentRow";

function announcementContentRow(data: Announcement, i: number): ContentRow {
	return {
		id: i + "",
		title: data.title,
		subtitle: undefined,
		site: data.siteUrl ?? "",
		when: data.published?.toDateString() ?? "—",
		owner: "<owner>",
		status: data.published ? "published" : "draft",
	};
}

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
	const [items, setItems] = React.useState(mockRows("ANN", 6));

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
			setItems(data.map((el, i) => announcementContentRow(el, i)));
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
