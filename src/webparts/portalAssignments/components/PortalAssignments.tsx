import * as React from "react";

import type { IPortalAssignmentsProps } from "./IPortalAssignmentsProps";

import type { PDAssignment } from "@type/PDAssignment";
import { RoleKey } from "@api/config";
import { AssignmentsApi } from "@api/assignments";
import { Collapsible } from "@components/Collapsible";
import {
	PDRoleBasedSelect,
	BlankGuestView,
} from "@components/PDRoleBasedSelect";
import * as Utils from "@utils";
import { PNPWrapper } from "@utils/PNPWrapper";

type AssignmentListItem = {
	title: string;
	date: string;
	PDDepartment: RoleKey;
};

function PDIntranetView({
	userGroupNames,
	pnpWrapper,
}: {
	userGroupNames: string[];
	pnpWrapper: PNPWrapper;
}): JSX.Element {
	const defaultItems: AssignmentListItem[] = [
		{
			title: "No Assignments",
			date: new Date().toDateString(),
			PDDepartment: "Everyone",
		},
	];
	const assignmentsApi = new AssignmentsApi(pnpWrapper);
	const [items, setItems] = React.useState(defaultItems);

	const load: () => Promise<void> = async () => {
		const rows = await assignmentsApi.get(12); // strategy auto
		const mapped = (rows || []).map((el: PDAssignment) => ({
			// id: ,
			title: el.title ?? "(untitled)",
			date: el.dueDate ? el.dueDate.toDateString() : "",
			// url: el.url ?? "",
			PDDepartment: el.PDDepartment,
			// siteUrl: ,
		}));
		setItems(mapped.length ? mapped : defaultItems);
	};

	React.useEffect(() => {
		Utils.loadCachedThenFresh(load);
	}, []);

	return (
		<div className="p-3">
			{items.map((it, i) => (
				<div key={i} className="py-1 text-sm">
					<span className="font-medium">{it.title}</span>
					<span className="text-slate-500"> — {it.date}</span>
				</div>
			))}
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
