import * as React from 'react';
// import styles from './PortalAssignments.module.scss';
import type { IPortalAssignmentsProps } from './IPortalAssignmentsProps';
// import { escape } from '@microsoft/sp-lodash-subset';

export default class PortalAssignments extends React.Component<IPortalAssignmentsProps> {
	public render(): React.ReactElement<IPortalAssignmentsProps> {
		// const {
		// 	description,
		// 	isDarkTheme,
		// 	environmentMessage,
		// 	hasTeamsContext,
		// 	userDisplayName
		// } = this.props;

		return (
			<section>
				<h4>Assignments</h4>
				<ul>
					<li>...</li>
					<li>...</li>
					<li>...</li>
				</ul>
			</section>
		);
	}
}
