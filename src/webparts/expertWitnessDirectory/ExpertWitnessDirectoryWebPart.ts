import * as React from "react";
import * as ReactDom from "react-dom";
import { BaseClientSideWebPart } from "@microsoft/sp-webpart-base";
import {
	type IPropertyPaneConfiguration,
	PropertyPaneToggle,
} from "@microsoft/sp-property-pane";

import ExpertWitnessDirectory from "./components/ExpertWitnessDirectory";
import type { IExpertWitnessDirectoryProps } from "./components/IExpertWitnessDirectoryProps";

import * as strings from "ExpertWitnessDirectoryWebPartStrings";

export interface IExpertWitnessDirectoryWebPartProps {
	fetchOnMount: boolean;
}

export default class ExpertWitnessDirectoryWebPart extends BaseClientSideWebPart<IExpertWitnessDirectoryWebPartProps> {
  public render(): void {
    const element: React.ReactElement<IExpertWitnessDirectoryProps> =
      React.createElement(ExpertWitnessDirectory, {
        instanceId: this.context.instanceId,
        siteUrl: this.context.pageContext.web.absoluteUrl,
        spHttpClient: this.context.spHttpClient,
		fetchOnMount: this.properties.fetchOnMount ?? true,
      });

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

	protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
		return {
			pages: [
				{
					header: {
						description: strings.PropertyPaneDescription,
					},
					groups: [
						{
							groupName: strings.BasicGroupName,
							groupFields: [
								PropertyPaneToggle("fetchOnMount", {
									label: strings.FetchOnMountFieldLabel,
									onText: "On",
									offText: "Off",
								}),
							],
						},
					],
				},
			],
		};
	}
}
