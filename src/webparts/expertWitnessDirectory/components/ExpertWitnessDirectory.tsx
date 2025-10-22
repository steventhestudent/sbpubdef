import * as React from 'react';
import type { IExpertWitnessDirectoryProps } from './IExpertWitnessDirectoryProps';

export default class ExpertWitnessDirectory extends React.Component<IExpertWitnessDirectoryProps> {
	public render(): React.ReactElement<IExpertWitnessDirectoryProps> {
		return (
			<section className="rounded-xl border border-slate-200 bg-white shadow-sm">
				<header className="border-b border-slate-200 px-4 py-3">
					<h4 className="text-base font-semibold text-slate-800">Expert Witness Directory</h4>
				</header>

				<div className="p-4">
					<form role="search" className="mx-auto max-w-lg">
						<label className="block text-sm font-medium text-slate-700" htmlFor="expert-search">Search experts</label>
						<div className="mt-1 flex">
							<input id="expert-search" type="search" placeholder="Name, field, location…" className="w-full rounded-l-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
							<button type="button" className="rounded-r-md border border-l-0 border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Search</button>
						</div>
					</form>

					<ul className="mt-4 grid gap-3 sm:grid-cols-2">
						{[1,2,3,4].map(k => (
							<li key={k} className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
								<div className="flex items-start justify-between">
									<div>
										<p className="text-sm font-semibold text-slate-800">Dr. Alex Expert</p>
										<p className="text-xs text-slate-600">Forensics • 10+ yrs • Santa Barbara</p>
									</div>
									<span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 border border-green-200">Available</span>
								</div>
								<p className="mt-2 line-clamp-2 text-sm text-slate-700">Areas: ballistics, toolmark analysis. Notes: prior testimony in SB Superior.</p>
								<div className="mt-2 flex gap-3 text-sm">
									<a href="#" className="text-blue-700 hover:underline">Profile</a>
									<a href="#" className="text-blue-700 hover:underline">Request CV</a>
								</div>
							</li>
						))}
					</ul>

					<p className="mt-3 text-xs text-slate-500"><em>Placeholder: Results will display matches from your directory source.</em></p>
				</div>
			</section>
		);
	}
}
