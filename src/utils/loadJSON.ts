import { SPHttpClient, SPHttpClientResponse } from "@microsoft/sp-http";
import { WebPartContext } from "@microsoft/sp-webpart-base";

export default function loadJSON(
	ctx: WebPartContext,
	url: string,
	cb: (data: any) => void,
) {
	ctx.httpClient
		.get(url, SPHttpClient.configurations.v1)
		.then((response: SPHttpClientResponse) => {
			return response.json();
		})
		.then((data: any) => {
			cb(data);
		})
		.catch((error: any) => {
			console.error("Error fetching JSON:", error);
		});
}
