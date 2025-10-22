import * as React from 'react';
import type { IAttorneyAssignmentsProps } from './IAttorneyAssignmentsProps';

export default class AttorneyAssignments extends React.Component<IAttorneyAssignmentsProps> {
	public render(): React.ReactElement<IAttorneyAssignmentsProps> {
		return (
			<section className="rounded-xl border border-slate-200 bg-white shadow-sm">
				<header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
					<h4 className="text-base font-semibold text-slate-800">Attorney Assignments</h4>
					<div className="flex items-center gap-2">
						<label className="sr-only" htmlFor="my-assignments">Filter</label>
						<select id="my-assignments" className="rounded-md border-slate-300 text-sm">
							<option>My cases</option>
							<option>All assignments</option>
						</select>
					</div>
				</header>

				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-slate-200">
						<thead className="bg-slate-50">
						<tr>
							{['Case #', 'Client', 'Court', 'Next Hearing', 'Status', ''].map(h => (
								<th key={h} scope="col" className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">{h}</th>
							))}
						</tr>
						</thead>
						<tbody className="divide-y divide-slate-200">
						{[1,2,3].map((i) => (
							<tr key={i} className="hover:bg-slate-50">
								<td className="px-4 py-3 text-sm text-slate-800">23-00{i}A</td>
								<td className="px-4 py-3 text-sm text-slate-700">J. Doe</td>
								<td className="px-4 py-3 text-sm text-slate-700">SB Superior</td>
								<td className="px-4 py-3 text-sm text-slate-700">Nov 06, 9:00 AM</td>
								<td className="px-4 py-3">
									<span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">Pending</span>
								</td>
								<td className="px-4 py-3 text-right">
									<a href="#" className="text-sm text-blue-700 hover:underline">Open</a>
								</td>
							</tr>
						))}
						</tbody>
					</table>
				</div>

				<p className="px-4 py-3 text-xs text-slate-500">
					<em>Placeholder: Will load from a SharePoint list and (preferably) filter by current user.</em>
				</p>
			</section>
		);
	}
}
