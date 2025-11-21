import * as React from "react";

import type { IPortalAssignmentsProps } from "./IPortalAssignmentsProps";

import type { PDAssignment } from "@type/PDAssignment";
import { AssignmentsApi } from "@api/assignments";
import { Collapsible } from "@components/Collapsible";
import {
	PDRoleBasedSelect,
	BlankGuestView,
} from "@components/PDRoleBasedSelect";
import * as Utils from "@utils";
import { PNPWrapper } from "@utils/PNPWrapper";

type AssignmentWebPartItem = PDAssignment;

function PDIntranetView({
	userGroupNames,
	pnpWrapper,
}: {
	userGroupNames: string[];
	pnpWrapper: PNPWrapper;
}): JSX.Element {
	const defaultItems: AssignmentWebPartItem[] = [
		{
			title: "No Assignments",
			PDDepartment: "Everyone",
		},
	];
	const assignmentsApi = new AssignmentsApi(pnpWrapper);
	const [items, setItems] = React.useState(defaultItems);

	const load: () => Promise<void> = async () => {
		const rows = await assignmentsApi.get(12); // strategy auto
		// const mapped = (rows || []).map((el: PDAssignment) => ({
		// 	title: el.title ?? "(untitled)",
		// 	PDDepartment: el.PDDepartment,
		// }));
		console.log("xxx", rows);
		const mapped = rows;
		setItems(mapped.length ? mapped : defaultItems);
	};

	React.useEffect(() => {
		Utils.loadCachedThenFresh(load);
	}, []);

	return (
		<div className="overflow-x-auto">
			{items.length === 0 ? (
				<p className="px-4 py-3 text-sm text-slate-500 italic">
					No assignments found.
				</p>
			) : (
				<table
					className="min-w-full divide-y divide-slater-800 table-fixed border-collapse"
					width="100%"
				>
					<thead className="bg-slate-50">
						<tr>
							{[
								"Case #",
								"Client",
								"Court",
								"Next Hearing",
								"Status",
								"",
							].map((header) => (
								<th
									key={header}
									scope="col"
									className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
								>
									{header}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-slater-800 bg-white">
						{items.map((item) => (
							<tr key={item.id} className="hover:bg-slate-50">
								<td className="px-4 py-3 text-sm text-slate-800">
									{item.caseNumber}
								</td>
								<td className="px-4 py-3 text-sm text-slate-700">
									{item.client}
								</td>
								<td className="px-4 py-3 text-sm text-slate-700">
									{item.court}
								</td>
								<td className="px-4 py-3 text-sm text-slate-700">
									{item.nextHearing
										? new Date(
												item.nextHearing,
											).toLocaleString()
										: "—"}
								</td>
								<td className="px-4 py-3 text-center">
									<span className="border border-black border-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">
										{item.status || "Pending"}
									</span>
								</td>
								<td className="px-4 py-3 text-right">
									{item.link ? (
										<a
											href={item.link}
											target="_blank"
											rel="noopener noreferrer"
											data-status={(
												item.status ?? ""
											).replace(
												/* spaces do not work for data- matching (needs quotations & it's a mess with spfx gulp tailwind etc. */
												/ /g,
												"",
											)}
											className="text-sm text-blue-700 hover:underline  bg-[#f1f5f9] text-[#334155] border border-[#cbd5e1]
													data-[status=AwaitingDocs]:multi-['bg-[#dbeafe];text-[#1e40af];border-[#3b82f6]']
													data-[status=Closed]:multi-['bg-[#fee2e2];text-[#991b1b];border-[#ef4444]']
													data-[status=Pending]:multi-['bg-[#fef3c7];text-[#92400e];border-[#fbbf24]']
													data-[status=Open]:multi-['bg-[#dcfce7];text-[#14532d];border-[#22c55e]']"
										>
											Open
										</a>
									) : (
										<span className="text-sm text-gray-400">
											—
										</span>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}

export default function PortalAssignments(
	props: IPortalAssignmentsProps,
): JSX.Element {
	return (
		<Collapsible instanceId={props.context.instanceId} title="Assignments">
			<PDRoleBasedSelect
				ctx={props.context}
				views={{
					Everyone: BlankGuestView,
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
