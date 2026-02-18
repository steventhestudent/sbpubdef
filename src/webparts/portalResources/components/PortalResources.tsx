import * as React from "react";
import type { IPortalResourcesProps } from "./IPortalResourcesProps";
import { Collapsible } from "@components/Collapsible";
import { PDRoleBasedSelect } from "@components/PDRoleBasedSelect";
import RoleBasedViewProps from "@type/RoleBasedViewProps";
import { ProcedureChecklist } from "@components/procedureChecklist/ProcedureChecklist";
import { WebPartContext } from "@microsoft/sp-webpart-base";

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
			LOP: "LOPS - Legal Office Procedural System",
			TrialSupervisor: "Attorney Workload",
			CDD: "Resource Guides",
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
						return <span>resource guides...</span>;
					if (sourceRole === "TrialSupervisor")
						return <span>AttorneyWorkload...</span>;
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
				Everyone: CollapsibleWrapper(props.context),
				PDIntranet: CollapsibleWrapper(props.context),
				Attorney: CollapsibleWrapper(props.context),
				LOP: CollapsibleWrapper(props.context),
				HR: CollapsibleWrapper(props.context),
				IT: CollapsibleWrapper(props.context),
				CDD: CollapsibleWrapper(props.context),
				TrialSupervisor: CollapsibleWrapper(props.context),
			}}
		/>
	);
}
