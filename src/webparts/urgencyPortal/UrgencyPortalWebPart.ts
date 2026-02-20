import * as React from "react";
import * as ReactDom from "react-dom";
import {
	BaseClientSideWebPart,
	IPropertyPaneConfiguration,
} from "@microsoft/sp-webpart-base";
import { PropertyPaneDropdown } from "@microsoft/sp-property-pane";

import {
	PropertyFieldCollectionData,
	CustomCollectionFieldType,
} from "@pnp/spfx-property-controls/lib/PropertyFieldCollectionData";

import UrgencyPortal from "./components/UrgencyPortal";
import {
	IUrgencyPortalProps,
	IPowerBiLinkConfig,
} from "./components/IUrgencyPortalProps";

export interface IUrgencyPortalWebPartProps {
	links: IPowerBiLinkConfig[];
	defaultUrl?: string;
}

export default class UrgencyPortalWebPart extends BaseClientSideWebPart<IUrgencyPortalWebPartProps> {
	public render(): void {
		const element: React.ReactElement<IUrgencyPortalProps> =
			React.createElement(UrgencyPortal, {
				context: this.context,
				links: this.properties.links || [],
				defaultUrl: this.properties.defaultUrl || "",
			});

		ReactDom.render(element, this.domElement);
	}

	protected onDispose(): void {
		ReactDom.unmountComponentAtNode(this.domElement);
	}

	protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
		const linkOptions = (this.properties.links || []).map(
			(l: IPowerBiLinkConfig): { key: string; text: string } => ({
				key: (l.url || "").trim(),
				text: (l.title || "").trim() || (l.url || "").trim(),
			}),
		);

		const options: Array<{ key: string; text: string }> = [
			{ key: "", text: "-- Select --" },
			...linkOptions.filter(
				(o: { key: string; text: string }): boolean => Boolean(o.key),
			),
		];

		return {
			pages: [
				{
					header: { description: "Power BI links" },
					groups: [
						{
							groupName: "Startup",
							groupFields: [
								PropertyPaneDropdown("defaultUrl", {
									label: "Default Link",
									options,
								}),
							],
						},
						{
							groupName: "Links",
							groupFields: [
								PropertyFieldCollectionData("links", {
									key: "links",
									label: "",
									panelHeader: "Manage links",
									manageBtnLabel: "Edit links",
									value: this.properties.links,
									fields: [
										{
											id: "title",
											title: "Title",
											type: CustomCollectionFieldType.string,
											required: true,
										},
										{
											id: "kind",
											title: "Type",
											type: CustomCollectionFieldType.dropdown,
											required: true,
											options: [
												{ key: "report", text: "Report" },
												{ key: "visual", text: "Visual" },
											],
										},
										{
											id: "url",
											title: "Power BI URL",
											type: CustomCollectionFieldType.string,
											required: true,
										},
									],
								}),
							],
						},
					],
				},
			],
		};
	}
}