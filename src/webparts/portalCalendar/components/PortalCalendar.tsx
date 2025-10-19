import * as React from 'react';
// import styles from './PortalCalendar.module.scss';
import type { IPortalCalendarProps } from './IPortalCalendarProps';
// import { escape } from '@microsoft/sp-lodash-subset';

export default class PortalCalendar extends React.Component<IPortalCalendarProps> {
  public render(): React.ReactElement<IPortalCalendarProps> {
    // const {
    //   description,
    //   isDarkTheme,
    //   environmentMessage,
    //   hasTeamsContext,
    //   userDisplayName
    // } = this.props;

    return (
      <section>
        <h4>Calendar / Events / Trainings</h4>
          <table>
              <tr><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
              <tr><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
              <tr><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
              <tr><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
              <tr><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
              <tr><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
              <tr><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
          </table>
      </section>
    );
  }
}
