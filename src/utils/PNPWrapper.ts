import { WebPartContext } from "@microsoft/sp-webpart-base";
import { SPFI } from "@pnp/sp";
import { Logger, LogLevel } from "@pnp/logging";
import { Web } from "@pnp/sp/webs";

import { getSP } from "@utils/pnpjsConfig";

export class PNPWrapper {
	private LOG_SOURCE = "PNPWrapper";
	private _sp: SPFI;

	constructor(webPartContext: WebPartContext) {
		this._sp = getSP(webPartContext);
	}

	async getAnnouncements() {
		try {
			const webUrl = `${window.location.origin}/sites/Attorney`;
			// Optionally
			// const webSP = spfi(webUrl).using(SPFx({ pageContext: this.context._pageContext }));
			// const web = webSP.web;
			const web = Web([this._sp.web, webUrl]);
			if (!web) return console.log("pnp: no web");
			const response = await web.lists
				.getByTitle("Documents")
				.items.select("Id", "Title")
				.expand("File")();
			return response;
		} catch (err) {
			console.log(`...err: `, err);
			Logger.write(
				`${this.LOG_SOURCE} (_getDemoItems) - ${JSON.stringify(err)}`,
				LogLevel.Error,
			);
		}
		return [];
	}
}
