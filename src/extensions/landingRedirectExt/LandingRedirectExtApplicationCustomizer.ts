import { BaseApplicationCustomizer } from "@microsoft/sp-application-base";
import { AadHttpClient, IHttpClientOptions } from "@microsoft/sp-http";

const REDIRECT_FLAG = "spfx-landing-redirected";

export interface RoleBasedRedirectRule {
	groups: string[] /** Azure AD group object IDs (GUIDs) */;
	targetURL: string /** Target site path, e.g. "/sites/attorney" */;
}

export interface ILandingRedirectExtApplicationCustomizerProperties {
	defaultURL: string /** Fallback landing site if no rule matches */;
	redirectRules: RoleBasedRedirectRule[];
}

/** Custom Action: can run during Client Side App execution */
export default class LandingRedirectExtApplicationCustomizer extends BaseApplicationCustomizer<ILandingRedirectExtApplicationCustomizerProperties> {
	public async onInit(): Promise<void> {
		if (sessionStorage.getItem(REDIRECT_FLAG) === "1") return; // Avoid loops within the same tab/session

		try {
			const target = await this._resolveTargetSite();
			console.debug("redirection target:", target);
			// if (!target) return;

			// const currentOrigin = window.location.origin.toLowerCase();
			// const currentPath = window.location.pathname.toLowerCase();
			// const normalizedTarget = target.toLowerCase();

			// const onTarget =
			// 	(currentOrigin + currentPath).startsWith(
			// 		currentOrigin + normalizedTarget
			// 	) || currentPath.startsWith(normalizedTarget);

			// if (onTarget) return;

			// sessionStorage.setItem(REDIRECT_FLAG, "1");
			// window.location.replace(normalizedTarget); // no extra history entry w/ .replace()
		} catch (e) {
			console.warn("Landing redirect failed", e);
		}
	}

	private async _resolveTargetSite(): Promise<string | null> {
		// Provide a typed fallback if manifest properties are missing
		const props: ILandingRedirectExtApplicationCustomizerProperties = this
			.properties ?? {
			defaultURL: "/sites/pd-internal",
			redirectRules: [],
		};

		const groupIds = await this._getUserGroupIds(); // set of lowercase GUIDs
		console.debug("props", props);
		console.debug("logged in user groups", groupIds);
		for (const rule of props.redirectRules) {
			if (!rule || !Array.isArray(rule.groups) || !rule.targetURL)
				continue; // guard against bad manifest data
			const hit = rule.groups.some((g) => groupIds.has(g.toLowerCase()));
			if (hit) return rule.targetURL;
		}

		return props.defaultURL || null;
	}

	private async _getUserGroupIds(): Promise<Set<string>> {
		const client = await this.context.aadHttpClientFactory.getClient(
			"https://graph.microsoft.com"
		);

		const options: IHttpClientOptions = {
			headers: { Accept: "application/json" },
		};

		let next: string | null =
			"https://graph.microsoft.com/v1.0/me/transitiveMemberOf?$select=id";
		const ids = new Set<string>();

		while (next) {
			const res = await client.get(
				next,
				AadHttpClient.configurations.v1,
				options
			);
			if (!res.ok) break;

			const json: {
				value?: Array<{ id?: string }>;
				["@odata.nextLink"]?: string;
			} = await res.json();

			for (const item of json.value ?? []) {
				if (item.id) ids.add(item.id.toLowerCase());
			}
			next = json["@odata.nextLink"] ?? null;
		}

		return ids;
	}
}
