import * as React from 'react';
import styles from './WelcomeMessage.module.scss';
import type { IWelcomeMessageProps } from './IWelcomeMessageProps';
import { escape } from '@microsoft/sp-lodash-subset';
import {WelcomeSearch} from "./WelcomeSearch";
import "../../../../dist/tailwind.css";

export default class WelcomeMessage extends React.Component<IWelcomeMessageProps> {
	public render(): React.ReactElement<IWelcomeMessageProps> {
		const {
			// description,
			// isDarkTheme,
			// environmentMessage,
			hasTeamsContext,
			userDisplayName
		} = this.props;

		return (
			<section className={`${styles.welcomeMessage} ${hasTeamsContext ? styles.teams : ''}`}>
				<div className={styles.welcome}>
					<div className="text-blue-900 lowercase text-2xl bg-green-900">TAILWIND WORKS!</div>
					<h2>Welcome to the Public Defender Resource Center, {escape(userDisplayName)}!</h2>
				</div>
				<WelcomeSearch />
			</section>
		);
	}
}
