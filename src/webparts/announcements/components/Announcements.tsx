import * as React from 'react';
// import styles from './Announcements.module.scss';
import type { IAnnouncementsProps } from './IAnnouncementsProps';
// import { escape } from '@microsoft/sp-lodash-subset';

export default class Announcements extends React.Component<IAnnouncementsProps> {
  public render(): React.ReactElement<IAnnouncementsProps> {
    const {
      // description,
      // isDarkTheme,
      // environmentMessage,
      // hasTeamsContext,
      // userDisplayName
    } = this.props;

    return (
      <section>
        <h4>Announcements</h4>
        ...
          <div>&lt;pull from SharePoint site announcements; show a list of titles of recent announcements; clicking on a title goes to full announcement&gt;</div>
      </section>
    );
  }
}
