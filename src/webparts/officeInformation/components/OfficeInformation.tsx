import * as React from 'react';
// import styles from './OfficeInformation.module.scss';
import type { IOfficeInformationProps } from './IOfficeInformationProps';
// import { escape } from '@microsoft/sp-lodash-subset';

export default class OfficeInformation extends React.Component<IOfficeInformationProps> {
  public render(): React.ReactElement<IOfficeInformationProps> {
    const {
      // description,
      // isDarkTheme,
      // environmentMessage,
      // hasTeamsContext,
      // userDisplayName
    } = this.props;

    let offices = `
            Office Locations
        Santa Barbara Office Courthouse
        1100 Anacapa Street
        Santa Barbara, CA 93101
        Phone:  (805) 568-3470
        Fax:  (805) 568-3536

        (805) 568-3564



        Santa Maria Office
        312-P East Cook Street
        Santa Maria, CA   93454
        Phone:  (805) 346-7500
        Fax:  (805) 614-6735



        Santa Maria Juvenile Office
        Juvenile Court Facility
        4285 California Blvd., Suite C
        Santa Maria, CA  93455
        Phone:  (805) 934-6944
        Fax:  (805) 934-6945



        Lompoc Office
        115 Civic Center Plaza
        Lompoc, CA    93436
        Phone:  (805) 737-7770
        Fax:  (805) 737-7881
    `;
    return (
      <section>
        <ul>
          <li>
            <a href="https://countyofsb.sharepoint.com/:x:/r/sites/PD-Internal/_layouts/15/Doc.aspx?sourcedoc=%7BBD6AA71E-FBCE-4515-ACF0-34B36E1B08F2%7D&file=Department-Phone-List_Last-Updated_05-09-2024.xlsx&action=default&mobileredirect=true">
              Contact List
            </a>
          </li>
          <li>
            <a href="https://countyofsb.sharepoint.com/sites/PD-Internal/SiteAssets/Forms/AllItems.aspx?id=%2Fsites%2FPD%2DInternal%2FSiteAssets%2FSitePages%2FHome%2FAtty%5FLOP%5FCDD%2DStaffing%5FUpdated%5F3%5F10%5F25%2Epdf&parent=%2Fsites%2FPD%2DInternal%2FSiteAssets%2FSitePages%2FHome">
              Organizational Chart
            </a>
          </li>
          <li>
            <a href="https://countyofsb.sharepoint.com/sites/PD-Internal/SiteAssets/Forms/AllItems.aspx?id=%2Fsites%2FPD%2DInternal%2FSiteAssets%2FSitePages%2FHome%2FInvestigator%2DIn%2DPerson%2DSchedule%2Epdf&parent=%2Fsites%2FPD%2DInternal%2FSiteAssets%2FSitePages%2FHome">
              Investigator-In-Person-Schedule
            </a>
          </li>
          <li>
            <a href="https://countyofsb.sharepoint.com/sites/IT-Connect/SitePages/How-to-Report-a-Suspicious-Email.aspx">
              How to report a suspicious Email
            </a>
          </li>
        </ul>

        <textarea wrap="yes" style={{width: 333, height: 200}}>{offices}</textarea>

        <ul>
          Other County Agencies
          <li>
            <a href="https://da.countyofsb.org/">DA</a>
          </li>
          <li>
            <a href="https://www.sbsheriff.org/home/who-is-in-custody/">SBCO Jail Inmate Info</a>
          </li>
          <li>
            <a href="https://www.countyofsb.org/389/Probation">Probation</a>
          </li>
        </ul>
      </section>
    );
  }
}
