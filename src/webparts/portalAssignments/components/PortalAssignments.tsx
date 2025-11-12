import * as React from "react";
import type { IPortalAssignmentsProps } from "./IPortalAssignmentsProps";
import * as Utils from "@utils";
import { PNPWrapper } from "@utils/PNPWrapper";
import { AssignmentsApi } from "@api/assignments";
import type { PDAssignment } from "@type/PDAssignment";
import { Collapsible } from "@components/Collapsible";
import { PDRoleBasedSelect } from "@components/PDRoleBasedSelect";

type AssignmentListItem = { title: string; date: string };

function EveryoneView({
	userGroupNames,
	pnpWrapper,
}: {
	userGroupNames: string[];
	pnpWrapper: PNPWrapper;
}): JSX.Element {
	return <div>You are guest in this house. Stay seated!</div>;
}
function PDIntranetView({
	userGroupNames,
	pnpWrapper,
}: {
	userGroupNames: string[];
	pnpWrapper: PNPWrapper;
}): JSX.Element {
	const assignmentsApi = new AssignmentsApi(pnpWrapper);
	const [items, setItems] = React.useState<AssignmentListItem[]>([
		{ title: "No Assignments", date: new Date().toDateString() },
	]);

	const load: () => Promise<void> = async () => {
		const rows = await assignmentsApi.get(12); // strategy auto
		const mapped = (rows || []).map((el: PDAssignment) => ({
			title: el.title ?? "(untitled)",
			date: new Date().toDateString(), // replace with your real dueDate mapping
		}));
		setItems(
			mapped.length
				? mapped
				: [
						{
							title: "No Assignments",
							date: new Date().toDateString(),
						},
					],
		);
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
