import * as React from 'react';
import type { IPortalBlogPostAnnouncementProps } from './IPortalBlogPostAnnouncementProps';

export default class PortalBlogPostAnnouncement extends React.Component<IPortalBlogPostAnnouncementProps> {
	public render(): React.ReactElement<IPortalBlogPostAnnouncementProps> {
		return (
			<section className="rounded-xl border border-slate-200 bg-white shadow-sm">
				<header className="border-b border-slate-200 px-4 py-3">
					<h4 className="text-base font-semibold text-slate-800">Portal Blog Post Announcement</h4>
				</header>
				<div className="p-4">
					<label className="block text-sm font-medium text-slate-700" htmlFor="blog-announce">Compose message</label>
					<textarea id="blog-announce" className="mt-1 h-28 w-full rounded-md border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="Type an announcement…" />
					<div className="mt-3 flex items-center justify-between">
						<span className="text-xs text-slate-500">Placeholder: Text area only; no submit yet.</span>
						<button type="button" className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">Preview</button>
					</div>
				</div>
			</section>
		);
	}
}
