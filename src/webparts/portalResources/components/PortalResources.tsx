import * as React from "react";
import type { IPortalResourcesProps } from "./IPortalResourcesProps";
import { Collapsible } from "@components/Collapsible";
import { PDRoleBasedSelect } from "@components/PDRoleBasedSelect";
import RoleBasedViewProps from "@type/RoleBasedViewProps";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import { ManualsAndHandbooks } from "@components/manualsAndHandbooks/ManualsAndHandbooks";
import { MostCommonForms } from "@components/mostCommonForms/MostCommonForms";
import { CDDResourceGuides } from "@components/cddResourceGuides/CDDResourceGuides";
import { ProcedureChecklist } from "@components/procedureChecklist/ProcedureChecklist";
import { AttorneyWorkload } from "@components/attorneyWorkload/AttorneyWorkload";

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
			EVERYONE: "Guest Resources",
			PDINTRANET: "Intranet Resources",
			ATTORNEY: "Attorney Resources",
			CDD: "CDD Resources",
			LOP: "LOPS - Legal Office Procedural System",
			TRIALSUPERVISOR: "Attorney Workload",
			HR: "HR Resources",
			COMPLIANCEOFFICER: "Compliance Officer",
			IT: "IT Resources",
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
					if (sourceRole === "TRIALSUPERVISOR")
						return (
							<AttorneyWorkload
								userGroupNames={userGroupNames}
								pnpWrapper={pnpWrapper}
								sourceRole={sourceRole}
							/>
						);
					if (sourceRole === "LOP")
						return (
							<ProcedureChecklist
								userGroupNames={userGroupNames}
								pnpWrapper={pnpWrapper}
								sourceRole={sourceRole}
							/>
						);
					if (sourceRole === "COMPLIANCEOFFICER")
						return (
							<div className="min-h-64">
								Compliance officer resources...
							</div>
						);
					if (sourceRole === "IT")
						return <div className="min-h-64">IT resources...</div>;
					return (
						<>
							<h2 className="m-4">Manuals and Handbooks:</h2>
							<ManualsAndHandbooks />
							<h2 className="m-4">Most Common Forms:</h2>
							<MostCommonForms />
						</>
					);
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
