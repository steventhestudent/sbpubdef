import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import * as React from 'react';
import * as ReactDom from 'react-dom';
import AttorneyWorkload from './components/AttorneyWorkload';
import { ILocationData, IAttorneyWorkloadProps } from './components/IAttorneyWorkloadProps';

// Interfaces matching your JSON
interface ICaseRaw {
  CaseID: string;
  CaseStatus: string;
  AttorneyID: number;
  CaseTypeID: number;
}

interface IAttorneyRaw {
  AttorneyID: number;
  Name: string;
  Location: string;
}

interface ICaseTypeRaw {
  CaseTypeID: number;
  Name: string;
}

interface ISharePointData {
  attorneys: IAttorneyRaw[];
  caseTypes: ICaseTypeRaw[];
  cases: ICaseRaw[];
}

export default class AttorneyWorkloadWebPart
  extends BaseClientSideWebPart<{}> {

  private locations: ILocationData[] = [];

  public async onInit(): Promise<void> {
    await super.onInit();
    await this.loadData();
  }

  private async loadData(): Promise<void> {
    try {
      // Fetch the JSON file from SharePoint
      const response = await fetch("https://csproject25.sharepoint.com/sites/PD-Intranet/Shared%20Documents/Intranet%20Form%20Database/Attorneys/Workload/attorneyWorkload.json");
      const data: ISharePointData = await response.json();

      // Transform into ILocationData[]
      const locationsMap = new Map<
        string,
        Map<string, Map<string, { CaseID: string; CaseStatus: string }[]>>
      >();

      data.attorneys.forEach(att => {
        const attorneyCases = data.cases.filter(c => c.AttorneyID === att.AttorneyID);

        attorneyCases.forEach(c => {
          const caseTypeRecord = data.caseTypes.find(ct => ct.CaseTypeID === c.CaseTypeID);
          const caseTypeName = caseTypeRecord?.Name ?? "Unknown";

          if (!locationsMap.has(att.Location)) {
            locationsMap.set(att.Location, new Map());
          }

          const caseTypesMap = locationsMap.get(att.Location)!;

          if (!caseTypesMap.has(caseTypeName)) {
            caseTypesMap.set(caseTypeName, new Map());
          }

          const attorneysMap = caseTypesMap.get(caseTypeName)!;

          if (!attorneysMap.has(att.Name)) {
            attorneysMap.set(att.Name, []);
          }

          attorneysMap.get(att.Name)!.push({
            CaseID: c.CaseID,
            CaseStatus: c.CaseStatus,
          });
        });
      });

      // Convert map to array structure for the component
      this.locations = Array.from(locationsMap.entries()).map(
        ([locationName, caseTypesMap]) => ({
          name: locationName,
          caseTypes: Array.from(caseTypesMap.entries()).map(
            ([caseTypeName, attorneysMap]) => ({
              type: caseTypeName,
              attorneys: Array.from(attorneysMap.entries()).map(
                ([attorneyName, cases]) => ({
                  name: attorneyName,
                  cases,
                })
              ),
            })
          ),
        })
      );

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