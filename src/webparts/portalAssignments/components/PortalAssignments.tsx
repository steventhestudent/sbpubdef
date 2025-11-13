import * as React from "react";

import type { IPortalAssignmentsProps } from "./IPortalAssignmentsProps";

import { RoleKey } from "@api/config";
import * as Utils from "@utils";
import { PNPWrapper } from "@utils/PNPWrapper";
import { AssignmentsApi } from "@api/assignments";
import type { PDAssignment } from "@type/PDAssignment";
import { Collapsible } from "@components/Collapsible";
import { PDRoleBasedSelect } from "@components/PDRoleBasedSelect";

type AssignmentListItem = {
	title: string;
	date: string;
	PDDepartment: RoleKey;
};

function EveryoneView({
	userGroupNames,
	pnpWrapper,
}: {
	userGroupNames: string[];
	pnpWrapper: PNPWrapper;
}): JSX.Element {
	return (
		<div className="p-5">
			<div>Welcome, Guest:</div>
			<div className="mt-2">
				You must have some form of PDIntranet role (Attorney, IT, HR,
				etc.) to have assignments.
			</div>
			<ul>
				<h5 className="font-bold">Groups:</h5>
				{userGroupNames.map((name: string) => (
					<li className="list-disc ml-5">{name}</li>
				))}
			</ul>
		</div>
	);
}

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

const AttorneyView = PDIntranetView;
const LOPView = PDIntranetView;
const HRView = PDIntranetView;
const ITView = PDIntranetView;

export default function PortalAssignments(
	props: IPortalAssignmentsProps,
): JSX.Element {
	return (
		<Collapsible instanceId={props.context.instanceId} title="Assignments">
			<PDRoleBasedSelect
				ctx={props.context}
				views={{
					Everyone: EveryoneView,
					PDIntranet: PDIntranetView,
					Attorney: AttorneyView,
					LOP: LOPView,
					HR: HRView,
					IT: ITView,
				}}
			/>
		</Collapsible>
	);
}
