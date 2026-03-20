import { BaseClientSideWebPart } from "@microsoft/sp-webpart-base";
import * as React from "react";
import * as ReactDom from "react-dom";
import AttorneyWorkload from "./components/AttorneyWorkload";
import {
	IAttorneyWorkloadProps,
	ICountyData,
} from "./components/IAttorneyWorkloadProps";

export interface IAttorneyWorkloadWebPartProps {
	// Placeholder for web part properties
}

export default class AttorneyWorkloadWebPart extends BaseClientSideWebPart<IAttorneyWorkloadWebPartProps> {
	public render(): void {
		// Example static data
		const counties: ICountyData[] = [
			{
				name: "North County",
				caseTypes: [
					{
						type: "Criminal Defense",
						attorneys: [
							{
								name: "Michael Henderson",
								cases: [
									{ number: "NOR-CR-2024-0412" },
									{ number: "NOR-CR-2024-0892" },
								],
							},
						],
					},
					{
						type: "Family Law",
						attorneys: [
							{
								name: "Sarah Jenkins",
								cases: [{ number: "NOR-FAM-2024-0012" }],
							},
						],
					},
				],
			},
			{
				name: "South County",
				caseTypes: [
					{
						type: "Civil Litigation",
						attorneys: [
							{
								name: "Rebecca Thorne",
								cases: [{ number: "SOU-CIV-2024-9912" }],
							},
						],
					},
				],
			},
		];

		const element: React.ReactElement<IAttorneyWorkloadProps> =
			React.createElement(AttorneyWorkload, { counties });

		ReactDom.render(element, this.domElement);
	}

	protected onDispose(): void {
		ReactDom.unmountComponentAtNode(this.domElement);
	}
}
