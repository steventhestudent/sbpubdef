import * as React from "react";
import type { IMostCommonFormsProps } from "./IMostCommonFormsProps";
import { Collapsible } from "@components/Collapsible";
import { MostCommonForms as MostCommonFormsComponent } from "@components/mostCommonForms/MostCommonForms";

export default class MostCommonForms extends React.Component<IMostCommonFormsProps> {
	public render(): React.ReactElement<IMostCommonFormsProps> {
		return (
			<Collapsible
				instanceId={this.props.context.instanceId}
				title="Most Common Forms"
			>
				<MostCommonFormsComponent />
			</Collapsible>
		);
	}
}
