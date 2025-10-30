// Cms.tsx
import * as React from "react";

import { PNPWrapper } from "@utils/PNPWrapper";

import type { ICmsProps } from "./ICmsProps";
import { CMSContainer } from "./cmsContainer";

export default class Cms extends React.Component<ICmsProps> {
	private pnpWrapper!: PNPWrapper;

	public componentDidMount(): void {
		this.pnpWrapper = new PNPWrapper(this.props.context);

		setTimeout(async () => {
			const anns = await this.pnpWrapper.getAnnouncements(12);
			console.log("announcements:", anns);
		}, 2000);
	}

	public render(): React.ReactElement<ICmsProps> {
		return <CMSContainer />;
	}
}
