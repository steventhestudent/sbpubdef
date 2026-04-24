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
			if (!container) return;

			// intercept navbar link click: Use a single capturing click handler so SharePoint's own handlers
			// (often attached to the anchor) don't win the race and hard-navigate.
			const handlerKey = "__sbpubdefNavRoleHashHandler";
			const existing = (container as any)[handlerKey] as
				| ((e: MouseEvent) => void)
				| undefined;
			if (existing)
				container.removeEventListener("click", existing, {
					capture: true,
				} as any);

			const setSelected = (hash: string) => {
				Array.from(container.querySelectorAll("a span")).forEach(
					($0: HTMLSpanElement) => $0.classList.remove("is-selected"),
				);
				const selected = container.querySelector(
					`a span[data-role-hash="${CSS.escape(hash)}"]`,
				) as HTMLSpanElement | null;
				selected?.classList.add("is-selected");
			};

			const clickHandler = (e: MouseEvent) => {
				const target = e.target as Element | null;
				if (!target) return;

				// Accept clicks anywhere within the anchor/span.
				const span = target.closest(
					"a span[data-role-hash]",
				) as HTMLSpanElement | null;
				if (!span) return;
				const hash = span.dataset.roleHash;
				if (!hash) return;

				e.preventDefault();
				e.stopPropagation();
				// In some SP builds, other listeners are on the same element.
				(e as any).stopImmediatePropagation?.();

				// Update URL hash without letting SP do a full navigation.
				if (location.hash !== `#${hash}`) location.hash = `#${hash}`;
				setSelected(hash);
			};

			(container as any)[handlerKey] = clickHandler;
			container.addEventListener("click", clickHandler, {
				capture: true,
			});

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
					if (hash) el.dataset.roleHash = hash;
					// Keep the anchor href stable; the click handler will update location.hash.
					if (hash)
						(el.parentNode as HTMLAnchorElement).href = `#${hash}`;
				},
			);
		})();
	}
}
