import * as React from 'react';
// import styles from './PortalBlogPostAnnouncement.module.scss';
import type { IPortalBlogPostAnnouncementProps } from './IPortalBlogPostAnnouncementProps';
// import { escape } from '@microsoft/sp-lodash-subset';

export default class PortalBlogPostAnnouncement extends React.Component<IPortalBlogPostAnnouncementProps> {
	public render(): React.ReactElement<IPortalBlogPostAnnouncementProps> {
		// const {
		// 	description,
		// 	isDarkTheme,
		// 	environmentMessage,
		// 	hasTeamsContext,
		// 	userDisplayName
		// } = this.props;

		return (
			<section>
				<h4>Portal Blog Post Announcement</h4>
				<textarea />
			</section>
		);
	}
}
