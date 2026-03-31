import * as React from "react";
import type { IAttorneyWorkloadProps } from "./IAttorneyWorkloadProps";
import styles from "./AttorneyWorkload.module.scss";
import { Collapsible } from "@components/Collapsible";
import { PDRoleBasedSelect } from "@components/PDRoleBasedSelect";
import RoleBasedViewProps from "@type/RoleBasedViewProps";
import { AttorneyWorkload as AttorneyWorkloadComponent } from "@components/attorneyWorkload/AttorneyWorkload";

function PDIntranetView({
	userGroupNames,
	pnpWrapper,
}: RoleBasedViewProps): JSX.Element {
	return <div>Not privileged enough</div>;
}
export default function AttorneyWorkload(
	props: IAttorneyWorkloadProps,
): JSX.Element {
	return (
		<section className={styles.attorneyWorkload}>
			<Collapsible
				instanceId={props.context.instanceId}
				title="Attorney Workload"
			>
				<PDRoleBasedSelect
					ctx={props.context}
					showSelect={true}
					selectLabel="Department"
					views={{
						EVERYONE: PDIntranetView,
						PDINTRANET: PDIntranetView,
						ATTORNEY: PDIntranetView,
						CDD: PDIntranetView,
						LOP: PDIntranetView,
						TRIALSUPERVISOR: AttorneyWorkloadComponent,
						COMPLIANCEOFFICER: PDIntranetView,
						HR: AttorneyWorkloadComponent,
						IT: AttorneyWorkloadComponent,
					}}
				/>
			</Collapsible>
		</section>
	);
}
