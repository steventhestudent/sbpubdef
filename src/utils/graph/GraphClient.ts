import { MSGraphClientV3 } from "@microsoft/sp-http";
import { WebPartContext } from "@microsoft/sp-webpart-base";

async function GraphClient(
	ctx: WebPartContext | MSGraphClientV3,
): Promise<MSGraphClientV3> {
	if (ctx && typeof (ctx as MSGraphClientV3).api === "function")
		return ctx as MSGraphClientV3; // ctx is already MSGraphClientV3
	return await (ctx as WebPartContext).msGraphClientFactory.getClient("3");
}

export { MSGraphClientV3, GraphClient };
