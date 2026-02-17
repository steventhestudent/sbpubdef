import * as React from "react";
import type { IPortalResourcesProps } from "./IPortalResourcesProps";
import { Collapsible } from "@components/Collapsible";
import { PDRoleBasedSelect } from "@components/PDRoleBasedSelect";
import RoleBasedViewProps from "@type/RoleBasedViewProps";
import { ProcedureChecklist } from "@components/procedureChecklist/ProcedureChecklist";
import { WebPartContext } from "@microsoft/sp-webpart-base";

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

// a wrapper to pass other things we want from webpart props (context)
function LOPViewWrapper(
	ctx: WebPartContext,
): ({
	userGroupNames,
	pnpWrapper,
	sourceRole,
}: RoleBasedViewProps) => JSX.Element {
	return function _ProcedureChecklist({
		userGroupNames,
		pnpWrapper,
		sourceRole,
	}: RoleBasedViewProps): JSX.Element {
		return (
			<Collapsible
				instanceId={ctx.instanceId}
				title="LOPS - Legal Office Procedural System"
			>
				<ProcedureChecklist
					userGroupNames={userGroupNames}
					pnpWrapper={pnpWrapper}
					sourceRole={sourceRole}
				/>
			</Collapsible>
		);
	};
}

export function PortalResources(props: IPortalResourcesProps): JSX.Element {
	return (
		<PDRoleBasedSelect
			ctx={props.context}
			views={{
				Everyone: PDIntranetView,
				PDIntranet: PDIntranetView,
				Attorney: PDIntranetView,
				LOP: LOPViewWrapper(props.context),
				HR: PDIntranetView,
				IT: LOPViewWrapper(props.context),
				CDD: ResourceGuides,
				TrialSupervisor: AttorneyWorkload,
			}}
		/>
	);
}
