import * as React from 'react';
import type { IOfficeInformationProps } from './IOfficeInformationProps';

export default class OfficeInformation extends React.Component<IOfficeInformationProps> {
	public render(): React.ReactElement<IOfficeInformationProps> {
		const offices = [
			{
				name: 'Santa Barbara Office Courthouse',
				lines: ['1100 Anacapa Street', 'Santa Barbara, CA 93101'],
				phone: '(805) 568-3470',
				fax: '(805) 568-3536'
			},
			{
				name: 'Santa Maria Office',
				lines: ['312-P East Cook Street', 'Santa Maria, CA 93454'],
				phone: '(805) 346-7500',
				fax: '(805) 614-6735'
			},
			{
				name: 'Santa Maria Juvenile Office',
				lines: ['4285 California Blvd., Suite C', 'Santa Maria, CA 93455'],
				phone: '(805) 934-6944',
				fax: '(805) 934-6945'
			},
			{
				name: 'Lompoc Office',
				lines: ['115 Civic Center Plaza', 'Lompoc, CA 93436'],
				phone: '(805) 737-7770',
				fax: '(805) 737-7881'
			}
		];

		return (
			<section className="rounded-xl border border-slate-200 bg-white shadow-sm">
				<header className="border-b border-slate-200 px-4 py-3">
					<h4 className="text-base font-semibold text-slate-800">Office Information</h4>
				</header>

				<div className="grid gap-2 p-2 sm:grid-cols-2">
					{offices.map((o, i) => (
						<div key={i} className="rounded-lg border border-slate-200 p-2 overflow-x-auto scrollbar-thin">
							<h5 className="text-2xs font-semibold text-slate-800 text-nowrap">{o.name}</h5>
							<p className="mt-1 text-xs text-slate-700 text-nowrap">{o.lines[0]}<br />{o.lines[1]}</p>
							<p className="mt-1 text-xs text-nowrap"><span className="text-slate-500">Phone:</span> <a href={"tel:+1" + o.phone.replace(/[()\s-]/g, "")}>📞</a> {o.phone}</p>
							<p className="text-xs text-nowrap"><span className="text-slate-500">Fax:</span> 📠 {o.fax}</p>
						</div>
					))}
				</div>

				<div className="border-t border-slate-200 px-4 py-3">
					<ul className="flex flex-wrap gap-4 text-sm">
						<li>
							<a className="text-blue-700 hover:underline" href="https://countyofsb.sharepoint.com/:x:/r/sites/PD-Internal/_layouts/15/Doc.aspx?sourcedoc=%7BBD6AA71E-FBCE-4515-ACF0-34B36E1B08F2%7D&file=Department-Phone-List_Last-Updated_05-09-2024.xlsx&action=default&mobileredirect=true">Contact List</a>
						</li>
						<li>
							<a className="text-blue-700 hover:underline" href="https://countyofsb.sharepoint.com/sites/PD-Internal/SiteAssets/Forms/AllItems.aspx?id=%2Fsites%2FPD%2DInternal%2FSiteAssets%2FSitePages%2FHome%2FAtty%5FLOP%5FCDD%2DStaffing%5FUpdated%5F3%5F10%5F25%2Epdf&parent=%2Fsites%2FPD%2DInternal%2FSiteAssets%2FSitePages%2FHome">Organizational Chart</a>
						</li>
						<li>
							<a className="text-blue-700 hover:underline" href="https://countyofsb.sharepoint.com/sites/PD-Internal/SiteAssets/Forms/AllItems.aspx?id=%2Fsites%2FPD%2DInternal%2FSiteAssets%2FSitePages%2FHome%2FInvestigator%2DIn%2DPerson%2DSchedule%2Epdf&parent=%2Fsites%2FPD%2DInternal%2FSiteAssets%2FSitePages%2FHome">Investigator In-Person Schedule</a>
						</li>
						<li>
							<a className="text-blue-700 hover:underline" href="https://countyofsb.sharepoint.com/sites/IT-Connect/SitePages/How-to-Report-a-Suspicious-Email.aspx">Report Suspicious Email</a>
						</li>
					</ul>
				</div>

				<div className="border-t border-slate-200 px-4 py-3">
					<h5 className="mb-1 text-sm font-semibold text-slate-800">Other County Agencies</h5>
					<ul className="flex flex-wrap gap-4 text-sm">
						<li><a className="text-blue-700 hover:underline" href="https://da.countyofsb.org/">DA</a></li>
						<li><a className="text-blue-700 hover:underline" href="https://www.sbsheriff.org/home/who-is-in-custody/">SBCO Jail Inmate Info</a></li>
						<li><a className="text-blue-700 hover:underline" href="https://www.countyofsb.org/389/Probation">Probation</a></li>
					</ul>
				</div>
			</section>
		);
	}
}
