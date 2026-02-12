import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import * as React from 'react';
import * as ReactDom from 'react-dom';
import AttorneyWorkload from './components/AttorneyWorkload';
import { IAttorneyWorkloadProps, ICountyData } from './components/IAttorneyWorkloadProps';

export interface IAttorneyWorkloadWebPartProps {
  // Placeholder for web part properties
}

export default class AttorneyWorkloadWebPart extends BaseClientSideWebPart<IAttorneyWorkloadWebPartProps> {

  public render(): void {
    // Example static data
    const counties: ICountyData[] = [
      {
        name: "Los Angeles County",
        caseTypes: [
          {
            type: "Criminal Defense",
            attorneys: [
              { name: "Michael Henderson", cases: [{ number: "LA-CR-2024-0412" }, { number: "LA-CR-2024-0892" }] }
            ]
          },
          {
            type: "Family Law",
            attorneys: [
              { name: "Sarah Jenkins", cases: [{ number: "LA-FAM-2024-0012" }] }
            ]
          }
        ]
      },
      {
        name: "Orange County",
        caseTypes: [
          {
            type: "Civil Litigation",
            attorneys: [
              { name: "Rebecca Thorne", cases: [{ number: "OC-CIV-2024-9912" }] }
            ]
          }
        ]
      }
    ];

    const element: React.ReactElement<IAttorneyWorkloadProps> = React.createElement(
      AttorneyWorkload,
      { counties }
    );

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }
}
