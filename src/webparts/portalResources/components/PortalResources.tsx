import * as React from "react";
import type { IPortalResourcesProps } from "./IPortalResourcesProps";
import { Collapsible } from "@components/Collapsible";
import { PDRoleBasedSelect } from "@components/PDRoleBasedSelect";
import RoleBasedViewProps from "@type/RoleBasedViewProps";
import { ProcedureChecklist } from "@components/procedureChecklist/ProcedureChecklist";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import { CDDResourceGuides } from "@components/cddResourceGuides/CDDResourceGuides";

// a wrapper to pass other things we want from webpart props (context)
function CollapsibleWrapper(
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
		const collapsibleTitles: { [key: string]: string } = {
			IT: "IT",
			ComplianceOfficer: "Compliance Officer",
			LOP: "LOPS - Legal Office Procedural System",
			TrialSupervisor: "Attorney Workload",
			CDD: "CDD",
		};
		return (
			<Collapsible
				instanceId={ctx.instanceId}
				title={
					(sourceRole && collapsibleTitles[sourceRole]) ||
					sourceRole + " (Unplanned)"
				}
			>
				{(function () {
					if (sourceRole === "CDD")
						return (
							<CDDResourceGuides
								userGroupNames={userGroupNames}
								pnpWrapper={pnpWrapper}
								sourceRole={sourceRole}
							/>
						);
					if (sourceRole === "TrialSupervisor")
						return (
							<div className="min-h-64">AttorneyWorkload...</div>
						);
					if (sourceRole === "LOP" || sourceRole === "IT")
						return (
							<ProcedureChecklist
								userGroupNames={userGroupNames}
								pnpWrapper={pnpWrapper}
								sourceRole={sourceRole}
							/>
						);
					return <span>mostCommonForms manualsAndHandbooks</span>;
				})()}
			</Collapsible>
		);
	};
}

export function PortalResources(props: IPortalResourcesProps): JSX.Element {
	return (
		<PDRoleBasedSelect
			ctx={props.context}
			views={{
				EVERYONE: CollapsibleWrapper(props.context),
				PDINTRANET: CollapsibleWrapper(props.context),
				ATTORNEY: CollapsibleWrapper(props.context),
				CDD: CollapsibleWrapper(props.context),
				LOP: CollapsibleWrapper(props.context),
				TrialSupervisor: CollapsibleWrapper(props.context),
				ComplianceOfficer: CollapsibleWrapper(props.context),
				HR: CollapsibleWrapper(props.context),
				IT: CollapsibleWrapper(props.context),
			}}
		/>
	);
}
