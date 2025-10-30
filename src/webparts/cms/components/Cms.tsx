import * as React from "react";

import { PNPWrapper } from "@utils/PNPWrapper";

import type { ICmsProps } from "./ICmsProps";
import { CMSContainer } from "./cmsContainer";

export default class Cms extends React.Component<ICmsProps> {
	private pnpWrapper: PNPWrapper;

	componentDidMount(): void {
		this.pnpWrapper = new PNPWrapper(this.props.context);

		setTimeout(async () => {
			console.log(
				"announcements (temp) lists first 100 Documents",
				await this.pnpWrapper.getAnnouncements(),
			);
		}, 2000);
	}

	public render(): React.ReactElement<ICmsProps> {
		return (
			<>
				<CMSContainer />
			</>
		);
	}
}
