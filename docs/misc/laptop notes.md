# web pages

### PUBDEF resources (bookmark folder)

https://countyofsb.sharepoint.com/sites/SBC-Connect
http://pubdefcms101:8080/sustain/login.jsp
http://pubdefleg101/masloco/wp-login.php?redirect_to=http%3A%2F%2Fpubdefleg101%2Fmasloco
https://essplus.co.santa-barbara.ca.us/
https://sbcpubdef.account.box.com/login

# laptop notes

user: pubdefextern08

is not an admin.

#### we cannot upload to AppCatalog or AppCatalog/ClientSideAssets

# New SharePoint: Default Groups

```
[
    [
        "37ebab93-fa36-4dea-8cf8-0e622f942a22",
        "All Company"
    ],
    [
        "65cd4ea4-6038-4bc0-b568-9576bacc0d80",
        "steventheworker"
    ]
]
```

# User: pubdefextern08's Groups

```
[
    [
        "33263b0d-b575-490e-baa0-773b2009b41d",
        "PUBDEF NetMotion Access - Users"
    ],
    [
        "3881b312-d2f3-4e56-9921-3510d47f8099",
        "SBC SG M365 Users"
    ],
    [
        "b97fa524-fc66-48e3-b355-3aeefbbebcae",
        "SBC SG M365 Pilot Testing"
    ],
    [
        "d2c5704b-a393-4fea-953d-591480920990",
        "PUBDEF LOGIN SETTINGS"
    ],
    [
        "a410d154-0e73-4c54-98d2-6f9d5166a0a3",
        "PDExtern"
    ],
    [
        "82ca4757-c652-4367-826a-1530c1e17015",
        "Public Defender"
    ],
    [
        "e2146769-d5ba-449c-8664-0303bcf31222",
        "PUBDEF VPN Remote Access"
    ],
    [
        "76663383-f483-4faa-a832-dbd293386ace",
        "SBC-M365-Teams Playground"
    ],
    [
        "0bebbd99-d0cb-4c76-ba07-90cdfd82d8e3",
        "PUBDEF SG M365 Users"
    ],
    [
        "df98c99c-faa9-40dc-b3a3-95ea654f5bf7",
        "SBC Everyone"
    ],
    [
        "7c658fa5-77f6-441c-99cb-e8009cf43a43",
        "SBC SG All Users"
    ],
    [
        "e09cf7a5-ee97-41d8-911e-e6314e4b0e31",
        "SBC SG M365 SSPR"
    ],
    [
        "470b19ae-b13d-4d1d-af72-8b40c88b2593",
        "SBC SG M365 OWA Access"
    ],
    [
        "a19768b7-e169-464d-8a93-7446caeb46bb",
        "SBC NetMotion Access - Users"
    ],
    [
        "5151c0b9-0072-4015-ba56-73ffcc559b33",
        "SBC SG M365 Conditional Access Migration"
    ],
    [
        "058f94bc-f917-4078-8037-2517a3f8eb97",
        "Public Defender-Santa Barbara"
    ],
    [
        "22c7f1bc-a7f7-44c2-9997-2623731579c5",
        "PUBDEF SG M365 SSPR"
    ],
    [
        "2f42afce-6e35-4039-a65c-b61e097d3e8a",
        "PUBDEF SG M365 OWA Access"
    ],
    [
        "dddd7af2-876f-4b83-902b-02b0ba805a28",
        "SBC APP M365 Teams User Deployment"
    ]
]
```

# found by replacing \_getUserGroupIds (modified to get names too)

```
	private async _getUserGroupIds(): Promise<Map<string, string>> {
		const client = await this.context.aadHttpClientFactory.getClient(
			"https://graph.microsoft.com"
		);

		const options: IHttpClientOptions = {
			headers: { Accept: "application/json" },
		};

		// Cast to groups and select id + displayName (add more if you want)

		let next: string | null =
			"https://graph.microsoft.com/v1.0/me/transitiveMemberOf/microsoft.graph.group?$select=id,displayName";

		const result = new Map<string, string>(); // id -> displayName

		while (next) {
			const res = await client.get(
				next,

				AadHttpClient.configurations.v1,

				options
			);

			if (!res.ok) break;

			const json: {
				value?: Array<{ id?: string; displayName?: string }>;

				["@odata.nextLink"]?: string;
			} = await res.json();

			for (const g of json.value ?? []) {
				if (g.id) result.set(g.id.toLowerCase(), g.displayName ?? "");
			}

			next = json["@odata.nextLink"] ?? null;
		}

		return result;
	}
}
```

<s>...for some reason it doesn't list (for my new sharepoint (also doesn't show in Entra ID -> groups)):
</s>

b262bfd2-effd-4d28-9850-5e13beaebddb

<s>(due to no name? but it does appear w/ $select=id (as in original function))
</s>

can ignore this (no groups were missing on countyofsb.sharepoint.com)


```
// my new sharepoint user's groups:
// "37ebab93-fa36-4dea-8cf8-0e622f942a22", // "All Company" (Azure AD group objectId)
// "65cd4ea4-6038-4bc0-b568-9576bacc0d80" // "steventhestudent"
//
// pubdefextern08's groups:
// PUBDEF NetMotion Access - Users,  SBC SG M365 Users,  SBC SG M365 Pilot Testing,
// PUBDEF LOGIN SETTINGS,  PDExtern,  Public Defender,  PUBDEF VPN Remote Access,
// SBC-M365-Teams Playground,  PUBDEF SG M365 Users,  SBC Everyone,  SBC SG All Users,
// SBC SG M365 SSPR,  SBC SG M365 OWA Access,  SBC NetMotion Access - Users,
// SBC SG M365 Conditional Access Migration,  Public Defender-Santa Barbara,
// PUBDEF SG M365 SSPR,  PUBDEF SG M365 OWA Access,  SBC APP M365 Teams User Deployment
```