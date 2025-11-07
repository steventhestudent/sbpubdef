import * as React from "react";
import { mockRows } from "@components/cms/MockRows";
import { ContentTable } from "@components/cms/ContentTable";
import { AnnouncementsApi } from "@api/announcements";
import { ContentRow } from "@type/cms/ContentRow";
import { Announcement } from "@type/PDAnnouncement";
import * as Utils from "@utils";

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
	const [items, setItems] = React.useState(mockRows("ANN", 1));

	async function load(): Promise<void> {
		const data = await announcementsApi.getAnnouncements(12);
		if (data) setItems(data.map((el, i) => announcementContentRow(el, i)));
		console.log("announcements: ", data);
	}
	React.useEffect(() => {
		Utils.loadCachedThenRefresh(load); // pnpWrapper.cacheVal is "true" <--- not bool: true (subsequent req's are not cached)
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
