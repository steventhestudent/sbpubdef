import * as React from 'react';
// import styles from './ExpertWitnessDirectory.module.scss';
import type { IExpertWitnessDirectoryProps } from './IExpertWitnessDirectoryProps';
// import { escape } from '@microsoft/sp-lodash-subset';

export default class ExpertWitnessDirectory extends React.Component<IExpertWitnessDirectoryProps> {
	public render(): React.ReactElement<IExpertWitnessDirectoryProps> {
		// const {
			// description,
			// isDarkTheme,
			// environmentMessage,
			// hasTeamsContext,
			// userDisplayName
		// } = this.props;

		return (
			<section>
				<h4>Expert Witness Directory</h4>
				<div style={{textAlign: "center"}}><input type="search" /></div>
				Results...
			</section>
		);
	}
}
