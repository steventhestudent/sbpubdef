import * as React from "react";
import type { ICmsProps } from "./ICmsProps";
import { CMSContainer } from "./cmsContainer";

export default class Cms extends React.Component<ICmsProps> {
	public render(): React.ReactElement<ICmsProps> {
		return (
			<>
				<CMSContainer />
			</>
		);
	}
}
