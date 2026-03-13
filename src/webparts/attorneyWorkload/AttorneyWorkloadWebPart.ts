import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import * as React from 'react';
import * as ReactDom from 'react-dom';
import AttorneyWorkload from './components/AttorneyWorkload';
import { ILocationData, IAttorneyWorkloadProps } from './components/IAttorneyWorkloadProps';

export default class AttorneyWorkloadWebPart
  extends BaseClientSideWebPart<{}> {

  private locations: ILocationData[] = [];

  public async onInit(): Promise<void> {
    await super.onInit();
    await this.loadData();
  }

  private async loadData(): Promise<void> {
    try {
      const response = await fetch('http://localhost:7071/api/GetCases');
      this.locations = await response.json();
      console.log("DATA LOADED:", this.locations);
    } catch (error) {
      console.error("API ERROR:", error);
      this.locations = [];
    }
  }

  public render(): void {
    const element: React.ReactElement<IAttorneyWorkloadProps> =
      React.createElement(AttorneyWorkload, {
        locations: this.locations
      });

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }
}