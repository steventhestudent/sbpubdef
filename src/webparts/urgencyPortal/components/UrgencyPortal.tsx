import * as React from "react";
import { IUrgencyPortalProps } from "./IUrgencyPortalProps";
import { Collapsible } from "@components/Collapsible";
import { UrgencyPortal as UrgencyPortalComponent } from "@components/urgencyPortal/UrgencyPortal";

export default function UrgencyPortal(props: IUrgencyPortalProps): JSX.Element {
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
