import * as React from 'react';
// import styles from './MostCommonForms.module.scss';
import type { IMostCommonFormsProps } from './IMostCommonFormsProps';
// import { escape } from '@microsoft/sp-lodash-subset';

export default class MostCommonForms extends React.Component<IMostCommonFormsProps> {
  public render(): React.ReactElement<IMostCommonFormsProps> {
    const {
      // description,
      // isDarkTheme,
      // environmentMessage,
      // hasTeamsContext,
      // userDisplayName
    } = this.props;

    return (
        <section>
          <h4>Most Common Forms:</h4>
          <ul>
            <li><a href="">Time Off Request</a></li>
            <li><a href="">Mileage Reimbursement</a></li>
            <li><a href="">County Employee Handbook</a></li>
          </ul>
        </section>
    );
  }
}
