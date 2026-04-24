import * as React from "react";
import { IUrgencyPortalWebPartProps } from "./IUrgencyPortalWebPartProps";
import { Collapsible } from "@components/Collapsible";
import { UrgencyPortal as UrgencyPortalComponent } from "@components/urgencyPortal/UrgencyPortal";
import * as Utils from "@utils";
import { PDRoleBasedSelect } from "@components/PDRoleBasedSelect";
import type RoleBasedViewProps from "@type/RoleBasedViewProps";

export default function UrgencyPortal(
	props: IUrgencyPortalWebPartProps,
): JSX.Element {
	const View = ({ userGroupNames }: RoleBasedViewProps): JSX.Element => {
		if (
			!(
				Utils.isIT(userGroupNames) ||
				Utils.hasRole(userGroupNames, "TRIALSUPERVISOR")
			)
		)
			return <></>;

		return (
			<Collapsible
				instanceId={props.context.instanceId}
				title="PowerBI - Urgency Portal"
			>
				<UrgencyPortalComponent
					defaultUrl={props.defaultUrl}
					context={props.context}
					links={props.links}
					carouselMode={props.carouselMode}
					visibleCount={props.visibleCount}
				/>
			</Collapsible>
		);
	};

	return (
		<PDRoleBasedSelect
			ctx={props.context}
			views={{ EVERYONE: View }}
			preventRoleForcing={false}
		/>
	);
}
