import * as React from 'react';
import type { IPortalAssignmentsProps } from './IPortalAssignmentsProps';

export default class PortalAssignments extends React.Component<IPortalAssignmentsProps> {
	public render(): React.ReactElement<IPortalAssignmentsProps> {
		return (
			<section className="rounded-xl border border-slate-200 bg-white shadow-sm">
				<header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
					<h4 className="text-base font-semibold text-slate-800">Assignments</h4>
					<a className="text-sm text-blue-700 hover:underline" href="#">Manage</a>
				</header>
				<ul className="divide-y divide-slate-200">
					{[1,2,3].map(i => (
						<li key={i} className="px-4 py-3 hover:bg-slate-50">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-slate-800">Task #{100+i}: Placeholder title</p>
									<p className="text-xs text-slate-600">Due in 7 days • Owner: You</p>
								</div>
								<span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">New</span>
							</div>
						</li>
					))}
				</ul>
				<p className="px-4 py-3 text-xs text-slate-500"><em>Placeholder: Replace with portal assignments source.</em></p>
			</section>
		);
	}
}
