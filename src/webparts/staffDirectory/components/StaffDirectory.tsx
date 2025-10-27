import * as React from "react";
import type { IStaffDirectoryProps } from "./IStaffDirectoryProps";
import { Collapsible } from "@components/Collapsible";

export default class StaffDirectory extends React.Component<IStaffDirectoryProps> {
	public render(): React.ReactElement<IStaffDirectoryProps> {
		return (
			<Collapsible
				instanceId={this.props.instanceId}
				title="Staff Directory"
			>
				<div className="p-4">
					<form role="search" className="mx-auto max-w-lg">
						<label
							className="block text-sm font-medium text-slate-700"
							htmlFor="staff-search"
						>
							Search staff
						</label>
						<input
							id="staff-search"
							type="search"
							placeholder="Name, role, office…"
							className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
						/>
					</form>

					<ul className="mt-4 divide-y divide-slate-200">
						{[1, 2, 3].map((i) => (
							<li
								key={i}
								className="flex items-center justify-between px-1 py-3"
							>
								<div className="flex items-center gap-3">
									<span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
										AB
									</span>
									<div>
										<p className="text-sm font-medium text-slate-800">
											Alex Barrister
										</p>
										<p className="text-xs text-slate-600">
											Attorney • Santa Barbara
										</p>
									</div>
								</div>
								<a
									href="#"
									className="text-sm text-blue-700 hover:underline"
								>
									Details
								</a>
							</li>
						))}
					</ul>
				</div>
			</Collapsible>
		);
	}
}
