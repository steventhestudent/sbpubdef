import * as React from "react";
import * as ReactDom from "react-dom";
import { BaseClientSideWebPart } from "@microsoft/sp-webpart-base";

import ExpertWitnessDirectory from "./components/ExpertWitnessDirectory";
import type { IExpertWitnessDirectoryProps } from "./components/IExpertWitnessDirectoryProps";

export interface IExpertWitnessDirectoryWebPartProps {}

export default class ExpertWitnessDirectoryWebPart extends BaseClientSideWebPart<IExpertWitnessDirectoryWebPartProps> {
  public render(): void {
    const element: React.ReactElement<IExpertWitnessDirectoryProps> =
      React.createElement(ExpertWitnessDirectory, {
        instanceId: this.context.instanceId,
        siteUrl: this.context.pageContext.web.absoluteUrl,
        spHttpClient: this.context.spHttpClient
      });

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }
}
