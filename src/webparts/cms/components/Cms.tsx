import * as React from "react";
import { getSP } from "@utils/pnpjsConfig";
import { SPFI } from "@pnp/sp";
import { Logger, LogLevel } from "@pnp/logging";
import { Web } from "@pnp/sp/webs";

// import {PNPWrapper} from "@utils/PNPWrapper";

import type { ICmsProps } from "./ICmsProps";
import { CMSContainer } from "./cmsContainer";

export default class Cms extends React.Component<ICmsProps> {
	private LOG_SOURCE = "🔶Cms";
	private LIBRARY_NAME = "Documents";
	private _sp: SPFI;

	componentDidMount(): void {
		this._sp = getSP(this.props.context);

		setTimeout(async () => {
			try {
				const webUrl = `${window.location.origin}/sites/PD-Intranet`;
				// Optionally
				// const webSP = spfi(webUrl).using(SPFx({ pageContext: this._pageContext }));
				// const web = webSP.web;
				const web = Web([this._sp.web, webUrl]);
				if (!web) return console.log("pnp: no web");
				const response = await web.lists
					.getByTitle(this.LIBRARY_NAME)
					.items.select("Id", "Title")
					.expand("File")();
				console.log("woo", response);
			} catch (err) {
				console.log(`...err: `, err);
				Logger.write(
					`${this.LOG_SOURCE} (_getDemoItems) - ${JSON.stringify(err)}`,
					LogLevel.Error,
				);
			}
		});
	}

	public render(): React.ReactElement<ICmsProps> {
		return (
			<>
				<CMSContainer />
			</>
		);
	}
}
