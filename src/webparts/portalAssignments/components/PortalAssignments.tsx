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
		<div className="">
			{items.length === 0 ? (
				<p className="p-1 text-sm text-slate-500 italic">
					No assignments found.
				</p>
			) : (
				<table className="divide-y divide-slater-800 table-fixed border-collapse w-[100%]">
					<thead className="bg-slate-50">
						<tr>
							{[
								"Case #",
								"Client",
								"Court",
								"Next Hearing",
								"Status",
							].map((header, i) => (
								<th
									key={i}
									scope="col"
									data-status={i + ""}
									className="relative p-1 text-xs font-semibold uppercase tracking-wide text-slate-600 text-center
									data-[i=0]:multi-['w-[2.666em];top-[-0.15em];left-[-0.15em]']
								"
								>
									{i === 0 ? "Case" : header}
									{i === 0 ? (
										<div className="absolute ml-2 mt-[-0.2em] w-0">
											#
										</div>
									) : null}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-slater-800 bg-white">
						{items.map((item) => (
							<tr key={item.id} className="hover:bg-slate-50">
								<td className="p-1 text-sm text-slate-800 text-center">
									{item.caseNumber}
								</td>
								<td className="p-1 text-sm text-slate-700">
									{item.client}
								</td>
								<td className="p-1 text-sm text-slate-700">
									{item.court}
								</td>
								<td className="p-1 text-sm text-slate-700">
									{item.nextHearing
										? new Date(
												item.nextHearing,
											).toLocaleString()
										: "—"}
								</td>
								<td className="p-1 text-center">
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
											className="rounded-2xl text-sm text-blue-700 hover:underline  bg-[#f1f5f9] text-[#334155] border border-[#cbd5e1]
													data-[status=AwaitingDocs]:multi-['bg-[#dbeafe];text-[#1e40af];border-[#3b82f6]']
													data-[status=Closed]:multi-['bg-[#fee2e2];text-[#991b1b];border-[#ef4444]']
													data-[status=Pending]:multi-['bg-[#fef3c7];text-[#92400e];border-[#fbbf24]']
													data-[status=Open]:multi-['bg-[#dcfce7];text-[#14532d];border-[#22c55e]']"
										>
											<span className="border border-black border-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">
												{item.status || "Pending"}
											</span>
										</a>
									) : (
										<span className="text-sm text-gray-400">
											<span className="border border-black border-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">
												{item.status || "Pending"}
											</span>
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
