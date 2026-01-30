import * as React from "react";
import * as ReactDom from "react-dom";
import { BaseClientSideWebPart } from "@microsoft/sp-webpart-base";

import LopsDirectory from "./components/LopsDirectory";
import type { ILopsDirectoryProps } from "./components/ILopsDirectoryProps";

export interface ILopsDirectoryWebPartProps {}

export default class LopsDirectoryWebPart extends BaseClientSideWebPart<ILopsDirectoryWebPartProps> {
  public render(): void {
    const element: React.ReactElement<ILopsDirectoryProps> =
      React.createElement(LopsDirectory, {
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