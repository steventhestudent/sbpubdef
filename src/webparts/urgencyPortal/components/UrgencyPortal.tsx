import * as React from "react";
import { IUrgencyPortalWebPartProps } from "./IUrgencyPortalWebPartProps";
import { Collapsible } from "@components/Collapsible";
import { UrgencyPortal as UrgencyPortalComponent } from "@components/urgencyPortal/UrgencyPortal";
import * as Utils from "@utils";

export default function UrgencyPortal(
	props: IUrgencyPortalWebPartProps,
): JSX.Element {
	const groups = Utils.cachedGroupNames();

	if (!(Utils.isIT(groups) || Utils.hasRole(groups, "TRIALSUPERVISOR")))
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
}
