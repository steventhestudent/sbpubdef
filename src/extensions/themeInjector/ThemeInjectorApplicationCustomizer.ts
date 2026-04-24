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
			const findActiveContainer = (): Element | null => {
				const containers = document.querySelectorAll(
					".ms-HorizontalNavItems",
				);
				return containers[containers.length - 1] ?? null;
			};

			const setSelectedInContainer = (
				container: Element,
				hash: string,
			) => {
				Array.from(container.querySelectorAll("a span")).forEach(
					($0: HTMLSpanElement) =>
						$0.classList.remove("is-selected"),
				);
				const selected = container.querySelector(
					`a span[data-role-hash="${CSS.escape(hash)}"]`,
				) as HTMLSpanElement | null;
				if (selected) {
					selected.classList.add("is-selected");
					return;
				}
				for (const span of Array.from(
					container.querySelectorAll("a span"),
				) as HTMLSpanElement[]) {
					const a = span.closest("a") as HTMLAnchorElement | null;
					const hrefHash = (a?.href || "").split("#")[1];
					if (hrefHash === hash) {
						span.classList.add("is-selected");
						return;
					}
				}
			};

			const decorateContainer = (container: Element) => {
				Array.from(container.querySelectorAll("a span")).forEach(
					(el: HTMLSpanElement) => {
						const a = el.closest("a") as HTMLAnchorElement | null;
						const hash = (a?.href || "").split("#")[1];
						el.classList.remove("is-selected");
						if (
							hash &&
							hash.replace("View-As-", "") ===
								Utils.roleViewPriority(
									Utils.cachedGroupNames(),
								)
						)
							el.classList.add("is-selected");
						if (hash) el.dataset.roleHash = hash;
						if (hash && a) a.href = `#${hash}`;
					},
				);
			};

			const initial = findActiveContainer();
			if (initial) decorateContainer(initial);

			// Document-level capture handler survives SP header re-renders.
			const docKey = "__sbpubdefNavRoleHashDocHandler";
			if (!(document as any)[docKey]) {
				const docClickHandler = (e: MouseEvent) => {
					const target = e.target as Element | null;
					if (!target) return;

					const a = target.closest(
						".ms-HorizontalNavItems a",
					) as HTMLAnchorElement | null;
					if (!a) return;

					const hash = (a.href || "").split("#")[1];
					if (!hash) return;

					e.preventDefault();
					e.stopPropagation();
					(e as any).stopImmediatePropagation?.();

					if (location.hash !== `#${hash}`)
						location.hash = `#${hash}`;

					const container = findActiveContainer();
					if (container) setSelectedInContainer(container, hash);
				};

				(document as any)[docKey] = docClickHandler;
				document.addEventListener("click", docClickHandler, {
					capture: true,
				});
			}

			// When SP swaps header variants on scroll, re-decorate new nav DOM.
			const moKey = "__sbpubdefNavRoleHashMO";
			if (!(window as any)[moKey]) {
				const mo = new MutationObserver(() => {
					const container = findActiveContainer();
					if (container) decorateContainer(container);
				});
				(window as any)[moKey] = mo;
				mo.observe(document.body, {
					childList: true,
					subtree: true,
				});
			}
		})();
	}
}
