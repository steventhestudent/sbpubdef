import "@dist/tailwind.css"; // to do: comment out in production? (do webparts all include a copy of it!?)
import "@styles/theme.css";
import "@styles/SharePointStyleOverride.css";
import "@styles/scrollbar-thin.css";
import "@styles/pd.css";
import "@styles/custom-overrides.css";

import { Log } from "@microsoft/sp-core-library";
import { BaseApplicationCustomizer } from "@microsoft/sp-application-base";
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
		DismissibleAnnouncementStrip();

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
					el.classList.remove("is-selected"); //todo: if matches PDRoleBasedSelect.roleViewPriority
					el.onclick = () => {
						Array.from(
							container.querySelectorAll("a span"),
						).forEach((el: HTMLSpanElement, i) =>
							el.classList.remove("is-selected"),
						);
						el.classList.add("is-selected");
					};
				},
			);
		})();
	}
}
