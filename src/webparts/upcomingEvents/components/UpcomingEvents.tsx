import * as React from 'react';
// import styles from './UpcomingEvents.module.scss';
import type { IUpcomingEventsProps } from './IUpcomingEventsProps';
// import { escape } from '@microsoft/sp-lodash-subset';

export default class UpcomingEvents extends React.Component<IUpcomingEventsProps> {
	public render(): React.ReactElement<IUpcomingEventsProps> {
		// const {
			// description,
			// isDarkTheme,
			// environmentMessage,
			// hasTeamsContext,
			// userDisplayName
		// } = this.props;

		return (
			<section>
				<h4>Upcoming Events</h4>
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
