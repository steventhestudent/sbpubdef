import * as React from "react";

import type { IAnnouncementsProps } from "./IAnnouncementsProps";

import type { PDAnnouncement } from "@type/PDAnnouncement";
import { AnnouncementsApi } from "@api/announcements";
import { Collapsible } from "@components/Collapsible";
import * as Utils from "@utils";

import { PDRoleBasedSelect } from "@components/PDRoleBasedSelect";
import RoleBasedViewProps from "@type/RoleBasedViewProps";

type AnnouncementWebPartItem = {
	title: string;
	date: string;
};

function PDIntranetView({
	userGroupNames,
	pnpWrapper,
}: RoleBasedViewProps): JSX.Element {
	const defaultItems: AnnouncementWebPartItem[] = [
		{
			title: "No Events",
			date: new Date().toDateString(),
		},
	];
	const announcementsApi = new AnnouncementsApi(pnpWrapper);
	const [items, setItems] = React.useState(defaultItems);

	const load: () => Promise<void> = async () => {
		const data = await announcementsApi.get(12);
		if (!data) return;
		const items: AnnouncementWebPartItem[] = data.map(
			(el: PDAnnouncement) => ({
				title: el.title ?? "(untitled)",
				date: el.published ? el.published.toDateString() : "",
			}),
		);
		setItems(items.length ? items : defaultItems);
	};

	React.useEffect(() => {
		Utils.loadCachedThenFresh(load);
	}, []);

	return (
		<section className="rounded-xl border border-[var(--webpart-border-color)] bg-[var(--webpart-bg-color)] shadow-sm">
			<ul className="divide-y divide-slater-800">
				{items.map((a, idx) => (
					<li key={idx} className="px-4 py-3 hover:bg-slate-50">
						<a className="flex items-start gap-3" href="#">
							<span
								className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-blue-600"
								aria-hidden
							/>
							<span className="flex-1">
								<span className="block text-sm font-medium text-slate-800">
									{a.title}
								</span>
								<span className="block text-xs text-slate-500">
									Added {a.date}
								</span>
							</span>
						</a>
					</li>
				))}
			</ul>
		</section>
	);
}

export function Announcements(props: IAnnouncementsProps): JSX.Element {
	return (
		<Collapsible
			instanceId={props.context.instanceId}
			title="Announcements"
		>
			<PDRoleBasedSelect
				ctx={props.context}
				showSelect={true}
				selectLabel="Department"
				views={{
					Everyone: PDIntranetView,
					PDIntranet: PDIntranetView,
					Attorney: PDIntranetView,
					LOP: PDIntranetView,
					HR: PDIntranetView,
					IT: PDIntranetView,
				}}
			/>
		</Collapsible>
	);
}
