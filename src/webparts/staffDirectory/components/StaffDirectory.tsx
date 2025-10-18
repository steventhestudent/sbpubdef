import * as React from 'react';
// import styles from './StaffDirectory.module.scss';
import type { IStaffDirectoryProps } from './IStaffDirectoryProps';
// import { escape } from '@microsoft/sp-lodash-subset';

export default class StaffDirectory extends React.Component<IStaffDirectoryProps> {
	public render(): React.ReactElement<IStaffDirectoryProps> {
		// const {
			// description,
			// isDarkTheme,
			// environmentMessage,
			// hasTeamsContext,
			// userDisplayName
		// } = this.props;

		return (
			<section>
				<h4>StaffDirectory</h4>
				<div style={{textAlign: "center"}}><input type="search" /></div>
				Results...
			</section>
		);
	}
}
