import * as React from "react";
import type { IOfficeHotelingProps } from "./IOfficeHotelingProps";
import { PDRoleBasedSelect } from "@components/PDRoleBasedSelect";
import type RoleBasedViewProps from "@type/RoleBasedViewProps";
import { OfficeHotelingInner } from "@components/officeHoteling/OfficeHotelingInner";

export function OfficeHoteling(props: IOfficeHotelingProps): JSX.Element {
	const View = ({ userGroupNames }: RoleBasedViewProps): JSX.Element => (
		<OfficeHotelingInner {...props} userGroupNames={userGroupNames} />
	);
	return (
		<PDRoleBasedSelect
			ctx={props.context}
			views={{ EVERYONE: View }}
			preventRoleForcing={false}
		/>
	);
}
