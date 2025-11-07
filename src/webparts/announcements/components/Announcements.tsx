import * as React from "react";
import type { IAnnouncementsProps } from "./IAnnouncementsProps";
import { PNPWrapper } from "@utils/PNPWrapper";
import { AnnouncementsApi } from "@api/announcements";
import { Announcement } from "@type/PDAnnouncement";
import * as Utils from "@utils";

type AnnouncementListItem = {
	title: string;
	date: string;
};

type IAnnouncementsState = {
	items: AnnouncementListItem[];
};

export default class Announcements extends React.Component<
	IAnnouncementsProps,
	IAnnouncementsState
> {
	private pnpWrapper: PNPWrapper;
	private announcementsApi: AnnouncementsApi;

	constructor(props: IAnnouncementsProps) {
		super(props);

		// non-state plumbing
		this.pnpWrapper = new PNPWrapper(this.props.context, {
			siteUrls: [
				"/sites/PD-Intranet",
				// "/sites/Attorney",
				// "/sites/LOP",
				"/sites/Tech-Team",
				"/sites/HR",
			],
			cache: "true",
		});
		this.announcementsApi = new AnnouncementsApi(this.pnpWrapper);

		// initial UI state
		this.state = {
			items: [
				{
					title: "No Events",
					date: new Date().toDateString(),
				},
			],
		};
	}

	public componentDidMount(): void {
		Utils.loadCachedThenRefresh(this.load);
	}

	private load = async (): Promise<void> => {
		const data = await this.announcementsApi.getAnnouncements(12);
		if (!data) return;
		const items: AnnouncementListItem[] = data.map((el: Announcement) => ({
			title: el.title ?? "(untitled)",
			date: el.published ? el.published.toDateString() : "",
		}));
		this.setState({ items });
	};

	public render(): React.ReactElement<IAnnouncementsProps> {
		const { items } = this.state;

		return (
			<section className="rounded-xl border border-slate-200 bg-white shadow-sm">
				<header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
					<h4 className="text-base font-semibold text-slate-800">
						Announcements
					</h4>
					<a
						className="text-sm text-blue-700 hover:underline"
						href="#"
					>
						View all
					</a>
				</header>

				<ul className="divide-y divide-slate-200">
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
}
