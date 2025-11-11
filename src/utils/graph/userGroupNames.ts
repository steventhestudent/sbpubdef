import type { WebPartContext } from "@microsoft/sp-webpart-base";

import { GraphClient } from "@utils/graph/GraphClient";
import { IGraphGroup } from "@type/IGraphGroup";

export async function userGroupNames(ctx: WebPartContext): Promise<string[]> {
	try {
		const res = await (await GraphClient(ctx))
			.api(`/me/memberOf?$select=displayName`)
			.get();
		return (res.value as IGraphGroup[])
			.filter((g) => typeof g.displayName === "string")
			.map((g) => g.displayName.toLowerCase());
	} catch (error) {
		console.error("Error checking Azure AD groups:", error);
		return [];
	}
}

// export async function getGroups(context: WebPartContext): Promise<Set<string>> {
// 	const client = await context.aadHttpClientFactory.getClient(
// 		"https://graph.microsoft.com",
// 	);
//
// 	const options: IHttpClientOptions = {
// 		headers: { Accept: "application/json" },
// 	};
//
// 	let next: string | null =
// 		"https://graph.microsoft.com/v1.0/me/transitiveMemberOf?$select=id";
// 	const ids = new Set<string>();
//
// 	while (next) {
// 		const res = await client.get(
// 			next,
// 			AadHttpClient.configurations.v1,
// 			options,
// 		);
// 		if (!res.ok) break;
//
// 		const json: {
// 			value?: Array<{ id?: string }>;
// 			["@odata.nextLink"]?: string;
// 		} = await res.json();
//
// 		for (const item of json.value ?? []) {
// 			if (item.id) ids.add(item.id.toLowerCase());
// 		}
// 		next = json["@odata.nextLink"] ?? null;
// 	}
//
// 	return ids;
// }
