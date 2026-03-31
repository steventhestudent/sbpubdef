import "@type/env.generated"; // load window.ENV
import "@dist/tailwind.css"; // to do: comment out in production? (do webparts all include a copy of it!?)
import "@styles/theme.css";
import "@styles/SharePointStyleOverride.css";
import "@styles/scrollbar-thin.css";
import "@styles/pd.css";
import "@styles/custom-overrides.css";

import { Log } from "@microsoft/sp-core-library";
import { BaseApplicationCustomizer } from "@microsoft/sp-application-base";
import * as Utils from "@utils";
import * as strings from "ThemeInjectorApplicationCustomizerStrings";
import { DismissibleAnnouncementStrip } from "./DismissibleAnnouncementStrip";
import { CompactMode } from "./CompactMode";

export default class ThemeInjectorApplicationCustomizer extends BaseApplicationCustomizer<{}> {
	public async onInit(): Promise<void> {
		Log.info(
			"ThemeInjectorApplicationCustomizer",
			`Initialized ${strings.Title}`,
		);
		this.context.application.navigatedEvent.add(this, this.onNavigate);
		console.log(`themeInjector.properties:`, this.properties);

		CompactMode();

		return Promise.resolve();
	}

	private onNavigate(): void {
		console.log("🔵 ThemeInjector onNavigate() called");
		DismissibleAnnouncementStrip(this.context).catch((error) => {
			console.error("Failed to load banner:", error);
		});

		(function () {
			const headerTitleAnchor = document.querySelector(
				"#SiteHeaderTitle a",
			) as HTMLAnchorElement;
			const isOnSiteHome =
				location.href.startsWith(headerTitleAnchor?.href) &&
				location.href.indexOf(".aspx") === -1;
			if (headerTitleAnchor)
				headerTitleAnchor.style.color = isOnSiteHome
					? "#f5ffb1"
					: "white";
		})();

		(function navItemsColor() {
			const containers = document.querySelectorAll(
				".ms-HorizontalNavItems",
			);
			const container = containers[containers.length - 1];
			Array.from(container.querySelectorAll("a span")).forEach(
				(el: HTMLSpanElement, i) => {
					const hash = (
						(el.parentNode as HTMLAnchorElement).href || ""
					).split("#")[1];
					el.classList.remove("is-selected");
					if (
						hash &&
						hash.replace("View-As-", "") ===
							Utils.roleViewPriority(Utils.cachedGroupNames())
					)
						el.classList.add("is-selected");
					el.onmousedown = (e) => {
						if (!hash) return;
						e.preventDefault();
						(el.parentNode as HTMLAnchorElement).href = "#" + hash;
						Array.from(
							container.querySelectorAll("a span"),
						).forEach(($0: HTMLSpanElement, i) =>
							$0.classList.remove("is-selected"),
						);
						el.classList.add("is-selected");
					};
				},
			);
		})();
	}
}
