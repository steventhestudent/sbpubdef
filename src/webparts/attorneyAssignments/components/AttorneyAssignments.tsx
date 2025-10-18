import * as React from 'react';
// import styles from './AttorneyAssignments.module.scss';
import type { IAttorneyAssignmentsProps } from './IAttorneyAssignmentsProps';
// import { escape } from '@microsoft/sp-lodash-subset';

export default class AttorneyAssignments extends React.Component<IAttorneyAssignmentsProps> {
  public render(): React.ReactElement<IAttorneyAssignmentsProps> {
    const {
      // description,
      // isDarkTheme,
      // environmentMessage,
      // hasTeamsContext,
      // userDisplayName
    } = this.props;

    return (
        <section>
          <h4>AttorneyAssignments</h4>
          ...
            <div>&lt;pull assignments from SharePoint list? Preferrably filtered by current user&gt;</div>
        </section>
    );
  }
}
