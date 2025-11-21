import * as React from "react";

import type { IAnnouncementsProps } from "./IAnnouncementsProps";

// import type { PDAnnouncement } from "@type/PDAnnouncement";
import { AnnouncementsApi } from "@api/announcements";
import { Collapsible } from "@components/Collapsible";
import * as Utils from "@utils";

import { PDRoleBasedSelect } from "@components/PDRoleBasedSelect";
import RoleBasedViewProps from "@type/RoleBasedViewProps";

// PDIntranetView (replace items shape + render)
type AnnouncementWebPartItem = {
	title: string;
	date?: string;
	url: string;
	summary?: string;
	dept?: string;
	author?: string;
	thumbnailUrl?: string;
	expire?: string;
	siteUrl?: string;
};

function PDIntranetView({
	userGroupNames,
	pnpWrapper,
	sourceRole,
}: RoleBasedViewProps): JSX.Element {
	const announcementsApi = new AnnouncementsApi(pnpWrapper);

	const defaultItems: AnnouncementWebPartItem[] = [
		{
			title: "No announcements",
			date: new Date().toDateString(),
			url: "#",
		},
	];

	const [items, setItems] = React.useState(defaultItems);

	const load = async (): Promise<void> => {
		const data = await announcementsApi.get(12);
		if (!data) return;
		const items: AnnouncementWebPartItem[] = data
			.filter(
				(el) =>
					sourceRole === "IT" ||
					(el.PDDepartment ?? "").replace(/-/g, "") === sourceRole,
			)
			.map((el) => ({
				title: el.title ?? "(untitled)",
				date: el.published ? el.published.toDateString() : undefined,
				url: el.url,
				summary: el.summary,
				dept: el.PDDepartment,
				author: el.author,
				thumbnailUrl: el.thumbnailUrl,
				expire: el.expireDate
					? el.expireDate.toDateString()
					: undefined,
				siteUrl: el.siteUrl,
			}));

		setItems(items.length ? items : defaultItems);
	};

	React.useEffect(() => {
		Utils.loadCachedThenFresh(load);
	}, [sourceRole]);

	return (
		<section className="rounded-xl border border-[var(--webpart-border-color)] bg-[var(--webpart-bg-color)] shadow-sm">
			<ul className="divide-y divide-slate-200">
				{items.map((a, idx) => (
					<li key={idx} className="px-4 py-3 hover:bg-slate-50">
						<a className="flex gap-3" href={a.url}>
							{/* Thumb */}
							{a.thumbnailUrl ? (
								<img
									src={a.thumbnailUrl}
									alt=""
									className="mt-0.5 h-12 w-12 rounded-md object-cover"
								/>
							) : (
								<span
									className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-blue-600"
									aria-hidden
								/>
							)}

							<span className="flex-1 min-w-0">
								<span className="flex items-center gap-2">
									<span className="block truncate text-sm font-medium text-slate-800">
										{a.title}
									</span>
									{a.dept && (
										<span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700">
											{a.dept}
										</span>
									)}
								</span>

								{a.summary && (
									<span className="mt-0.5 block text-xs text-slate-600 line-clamp-2">
										{a.summary}
									</span>
								)}

								<span className="mt-1 block text-[11px] text-slate-500">
									{a.author ? `By ${a.author}` : null}
									{a.author && (a.date || a.expire)
										? " · "
										: null}
									{a.date ? `Published ${a.date}` : null}
									{a.expire ? ` · Expires ${a.expire}` : null}
									{a.siteUrl
										? ` · ${a.siteUrl.replace(/^https?:\/\/[^/]+/, "")}`
										: null}
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
