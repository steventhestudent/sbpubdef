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
	items,
	userGroupNames,
}: {
	items: AssignmentListItem[];
	userGroupNames: string[];
}): JSX.Element {
	console.log(userGroupNames);
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

const AttorneyView = EveryoneView;
const LOPView = EveryoneView;
const HRView = EveryoneView;
const ITView = EveryoneView;

export default function PortalAssignments(
	props: IPortalAssignmentsProps,
): JSX.Element {
	const pnpWrapper = new PNPWrapper(props.context, {
		siteUrls: ["/sites/PD-Intranet", "/sites/Tech-Team", "/sites/HR"],
		cache: "true",
	});
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
		<Collapsible instanceId={props.context.instanceId} title="Assignments">
			<PDRoleBasedSelect<AssignmentListItem>
				ctx={props.context}
				items={items}
				views={{
					Everyone: EveryoneView,
					Attorney: AttorneyView,
					LOP: LOPView,
					HR: HRView,
					IT: ITView,
				}}
			/>
		</Collapsible>
	);
}
