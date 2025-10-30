// @webparts/cms/components/Cms.tsx
import * as React from "react";

import { PNPWrapper } from "@utils/PNPWrapper";

import type { ICmsProps } from "./ICmsProps";
import { CMSContainer } from "@components/cms/cmsContainer";

import { AnnouncementsApi } from "@api/announcements";

export default class Cms extends React.Component<ICmsProps> {
	private pnpWrapper!: PNPWrapper;
	private anns!: AnnouncementsApi;

	public componentDidMount(): void {
		this.pnpWrapper = new PNPWrapper(this.props.context, {
			siteUrls: ["/sites/Attorney", "/sites/LOP", "/sites/HR"],
			cache: false,
		});
		this.anns = new AnnouncementsApi(this.pnpWrapper);

		setTimeout(async () => {
			const data = await this.anns.getAnnouncements(12);
			console.log("announcements:", data);
		});
	}

	public render(): React.ReactElement {
		return <CMSContainer />;
	}
}
