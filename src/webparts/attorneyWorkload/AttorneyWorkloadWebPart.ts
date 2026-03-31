import { BaseClientSideWebPart } from "@microsoft/sp-webpart-base";
import * as React from "react";
import * as ReactDom from "react-dom";
import AttorneyWorkload from "./components/AttorneyWorkload";
import { IAttorneyWorkloadProps } from "./components/IAttorneyWorkloadProps";

export default class AttorneyWorkloadWebPart extends BaseClientSideWebPart<{}> {
	public async onInit(): Promise<void> {
		await super.onInit();
	}

	public render(): void {
		const element: React.ReactElement<IAttorneyWorkloadProps> =
			React.createElement(AttorneyWorkload, { context: this.context });

		ReactDom.render(element, this.domElement);
	}

	protected onDispose(): void {
		ReactDom.unmountComponentAtNode(this.domElement);
	}
}
