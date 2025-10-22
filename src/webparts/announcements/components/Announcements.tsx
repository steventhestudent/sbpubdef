import * as React from 'react';
import type { IAnnouncementsProps } from './IAnnouncementsProps';

export default class Announcements extends React.Component<IAnnouncementsProps> {
	public render(): React.ReactElement<IAnnouncementsProps> {
		return (
			<section className="rounded-xl border border-slate-200 bg-white shadow-sm">
				<header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
					<h4 className="text-base font-semibold text-slate-800">Announcements</h4>
					<a className="text-sm text-blue-700 hover:underline" href="#">View all</a>
				</header>

				<ul className="divide-y divide-slate-200">
					{[
						{ title: 'Office closure on Friday for training', date: 'Oct 10' },
						{ title: 'New mileage reimbursement form', date: 'Oct 02' },
						{ title: 'Security reminder: phishing drill', date: 'Sep 27' }
					].map((a, idx) => (
						<li key={idx} className="px-4 py-3 hover:bg-slate-50">
							<a className="flex items-start gap-3" href="#">
								<span className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-hidden />
								<span className="flex-1">
                  <span className="block text-sm font-medium text-slate-800">{a.title}</span>
                  <span className="block text-xs text-slate-500">Added {a.date}</span>
                </span>
							</a>
						</li>
					))}
				</ul>

				<div className="px-4 py-3 text-xs text-slate-500">
					<em>Placeholder: This will pull recent SharePoint announcements; clicking a title opens the full item.</em>
				</div>
			</section>
		);
	}
}
