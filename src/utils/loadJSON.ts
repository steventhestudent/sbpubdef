import { SPHttpClient, SPHttpClientResponse } from "@microsoft/sp-http";
import { WebPartContext } from "@microsoft/sp-webpart-base";

export default function loadJSON<T>(
	ctx: WebPartContext,
	url: string,
	cb: (data: T | undefined) => void,
): void {
	ctx.httpClient
		.get(url, SPHttpClient.configurations.v1)
		.then((response: SPHttpClientResponse) => {
			return response.json();
		})
		.then((data: T) => {
			cb(data);
		})
		.catch((error: Error) => {
			console.error("Error fetching JSON:", error);
			cb(undefined);
		});
}
