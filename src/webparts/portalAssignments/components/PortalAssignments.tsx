import * as React from "react";

import type { IPortalAssignmentsProps } from "./IPortalAssignmentsProps";

import * as Utils from "@utils";
import { PNPWrapper } from "@utils/PNPWrapper";
import { AssignmentsApi } from "@api/assignments";
import { PDAssignment } from "@type/PDAssignment";

import { Collapsible } from "@components/Collapsible";

type AssignmentListItem = {
	title: string;
	date: string;
};

export default function PortalAssignments(
	props: IPortalAssignmentsProps,
): JSX.Element {
	const pnpWrapper = new PNPWrapper(props.context, {
		siteUrls: [
			"/sites/PD-Intranet",
			// "/sites/Attorney",
			// "/sites/LOP",
			"/sites/Tech-Team",
			"/sites/HR",
		],
		cache: "true",
	});
	const assignmentsApi = new AssignmentsApi(pnpWrapper);
	const [items, setItems] = React.useState<AssignmentListItem[]>([
		{ title: "No Assignments", date: new Date().toDateString() },
	]);

	const load = async (): Promise<void> => {
		console.log(`portalAssignments load...`, await assignmentsApi.get(12));
		setItems(
			((await assignmentsApi.get(12)) || []).map((el: PDAssignment) => ({
				title: el.title ?? "(untitled)",
				date: "ok" ?? "pk",
			})),
		);
	};
	React.useEffect(() => Utils.loadCachedThenFresh(load), []);

	return (
		<Collapsible instanceId={props.context.instanceId} title="Assignments">
			{items.map((item, i) => (
				<div key={i}>PDAssignment</div>
			))}
		</Collapsible>
	);
}
