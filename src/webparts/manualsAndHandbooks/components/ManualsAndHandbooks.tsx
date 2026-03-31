import * as React from "react";
import type { IManualsAndHandbooksProps } from "./IManualsAndHandbooksProps";
import { Collapsible } from "@components/Collapsible";
import { ManualsAndHandbooks as ManualsAndHandbooksComponent } from "@components/manualsAndHandbooks/ManualsAndHandbooks";

export default class ManualsAndHandbooks extends React.Component<IManualsAndHandbooksProps> {
	public render(): React.ReactElement<IManualsAndHandbooksProps> {
		return (
			<Collapsible
				instanceId={this.props.instanceId}
				title="Manuals &amp; Handbooks"
			>
				<ManualsAndHandbooksComponent />
			</Collapsible>
		);
	}
}
