import * as React from 'react';
// import styles from './ManualsAndHandbooks.module.scss';
import type { IManualsAndHandbooksProps } from './IManualsAndHandbooksProps';
// import { escape } from '@microsoft/sp-lodash-subset';

export default class ManualsAndHandbooks extends React.Component<IManualsAndHandbooksProps> {
	public render(): React.ReactElement<IManualsAndHandbooksProps> {
		// const {
			// description,
			// isDarkTheme,
			// environmentMessage,
			// hasTeamsContext,
			// userDisplayName
		// } = this.props;

		return (
			<section>
				<h4>Manuals / Handbooks:</h4>
				<ul>
					<li>...</li>
					<li>...</li>
					<li>...</li>
				</ul>
			</section>
		);
	}
}
