// @webparts/cms/components/Cms.tsx
import * as React from "react";

import { PNPWrapper } from "@utils/PNPWrapper";

import type { ICmsProps } from "./ICmsProps";
import { CMSContainer } from "@components/cms/cmsContainer";

type ICmsState = { pnpWrapper: PNPWrapper };

export default class Cms extends React.Component<ICmsProps, ICmsState> {
	constructor(props: ICmsProps) {
		super(props);
		this.state = {
			pnpWrapper: new PNPWrapper(this.props.context, {
				siteUrls: [
					"/sites/PD-Intranet",
					// "/sites/Attorney",
					// "/sites/LOP",
					// "/sites/Tech-Team",
					// "/sites/HR",
				],
				cache: "true", //todo: change to "true"
			}),
		};
	}

	public render(): React.ReactElement {
		return <CMSContainer pnpWrapper={this.state.pnpWrapper} />;
	}
}
