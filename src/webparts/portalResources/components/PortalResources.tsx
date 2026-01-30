import * as React from "react";
import type { IPortalResourcesProps } from "./IPortalResourcesProps";
import { Collapsible } from "@components/Collapsible";
import { PDRoleBasedSelect } from "@components/PDRoleBasedSelect";
import RoleBasedViewProps from "@type/RoleBasedViewProps";

function PDIntranetView({
	userGroupNames,
	pnpWrapper,
	sourceRole,
}: RoleBasedViewProps): JSX.Element {
	return (
		<ul>
			<li>mostCommonForms</li>
			<li>manualsAndHandbooks</li>
		</ul>
	);
}

function ResourceGuides({
	userGroupNames,
	pnpWrapper,
	sourceRole,
}: RoleBasedViewProps): JSX.Element {
	return (
		<ul>
			<li>ResourceGuides</li>
		</ul>
	);
}
function ProcedureChecklist({
	userGroupNames,
	pnpWrapper,
	sourceRole,
}: RoleBasedViewProps): JSX.Element {
	return (
		<ul>
			<li>ProcedureChecklist</li>
		</ul>
	);
}
function AttorneyWorkload({
	userGroupNames,
	pnpWrapper,
	sourceRole,
}: RoleBasedViewProps): JSX.Element {
	return (
		<ul>
			<li>AttorneyWorkload</li>
		</ul>
	);
}
export function PortalResources(props: IPortalResourcesProps): JSX.Element {
	return (
		<Collapsible
			instanceId={props.context.instanceId}
			title="Resources"
			className="h-100"
		>
			<PDRoleBasedSelect
				ctx={props.context}
				views={{
					Everyone: PDIntranetView,
					PDIntranet: PDIntranetView,
					Attorney: PDIntranetView,
					LOP: ProcedureChecklist,
					HR: PDIntranetView,
					IT: PDIntranetView,
					CDD: ResourceGuides,
					TrialSupervisor: AttorneyWorkload,
				}}
			/>
		</Collapsible>
	);
}
