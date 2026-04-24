import "@type/env.generated"; // load window.ENV
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
			const doc = document as Document & Record<string, unknown>;
			const win = window as unknown as Window & Record<string, unknown>;

			const forcedKey = "__sbpubdefForcedRoleHash";
			const getForcedHash = (): string | null => {
				try {
					const v = sessionStorage.getItem(forcedKey);
					return v && v.length ? v : null;
				} catch {
					return null;
				}
			};
			const setForcedHash = (hash: string): void => {
				try {
					sessionStorage.setItem(forcedKey, hash);
				} catch {
					// ignore
				}
			};

			const allContainers = (): Element[] =>
				Array.from(document.querySelectorAll(".ms-HorizontalNavItems"));

			const currentHash = (): string | null => {
				const raw = (location.hash || "").replace(/^#/, "");
				if (!raw) return null;
				try {
					return decodeURIComponent(raw);
				} catch {
					return raw;
				}
			};

			const setSelectedInContainer = (
				container: Element,
				hash: string,
			): void => {
				for (const el of Array.from(
					container.querySelectorAll("a, a span"),
				) as Array<HTMLAnchorElement | HTMLSpanElement>) {
					el.classList.remove("is-selected");
				}

				const aSelected = container.querySelector(
					`a[data-role-hash="${CSS.escape(hash)}"]`,
				) as HTMLAnchorElement | null;
				if (aSelected) {
					aSelected.classList.add("is-selected");
					(
						(aSelected.querySelector(
							"span",
						) as HTMLSpanElement | null) ?? null
					)?.classList.add("is-selected");
					return;
				}

				// Fallback: match by href hash.
				for (const a of Array.from(
					container.querySelectorAll("a"),
				) as HTMLAnchorElement[]) {
					const hrefHash = (a.href || "").split("#")[1];
					if (hrefHash === hash) {
						a.classList.add("is-selected");
						(
							(a.querySelector(
								"span",
							) as HTMLSpanElement | null) ?? null
						)?.classList.add("is-selected");
						return;
					}
				}
			};

			const decorateContainer = (container: Element): void => {
				for (const a of Array.from(
					container.querySelectorAll("a"),
				) as HTMLAnchorElement[]) {
					const hash = (a.href || "").split("#")[1];
					if (!hash) continue;
					a.dataset.roleHash = hash;
					// Keep anchor hash-only to avoid SP hard nav.
					a.href = `#${hash}`;

					const span = a.querySelector(
						"span",
					) as HTMLSpanElement | null;
					if (span) span.dataset.roleHash = hash;
				}

				const selectedHash = getForcedHash() ?? currentHash();
				if (selectedHash)
					setSelectedInContainer(container, selectedHash);
			};

			for (const c of allContainers()) decorateContainer(c);
			// If SP clears the URL hash during header swaps, keep the user's last forced role.
			const forced = getForcedHash();
			if (forced && !currentHash()) location.hash = `#${forced}`;

			// Document-level capture handler survives SP header re-renders.
			const docKey = "__sbpubdefNavRoleHashDocHandler";
			if (!doc[docKey]) {
				const docClickHandler = (e: MouseEvent): void => {
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
					e.stopImmediatePropagation();

					setForcedHash(hash);
					if (location.hash !== `#${hash}`)
						location.hash = `#${hash}`;

					const clickedContainer = a.closest(
						".ms-HorizontalNavItems",
					) as Element | null;
					if (clickedContainer) {
						decorateContainer(clickedContainer);
						setSelectedInContainer(clickedContainer, hash);
					}

					// If SP swaps headers after click, re-apply selection after DOM settles.
					requestAnimationFrame(() => {
						for (const c of allContainers()) decorateContainer(c);
						for (const c of allContainers())
							setSelectedInContainer(c, hash);
					});
				};

				doc[docKey] = docClickHandler;
				document.addEventListener("click", docClickHandler, {
					capture: true,
				});
			}

			// When SP swaps header variants on scroll, re-decorate new nav DOM.
			const moKey = "__sbpubdefNavRoleHashMO";
			if (!win[moKey]) {
				let raf: number | null = null;
				const mo = new MutationObserver(() => {
					if (raf) cancelAnimationFrame(raf);
					raf = requestAnimationFrame(() => {
						for (const c of allContainers()) decorateContainer(c);
						const sel = getForcedHash() ?? currentHash();
						if (sel)
							for (const c of allContainers())
								setSelectedInContainer(c, sel);
					});
				});
				win[moKey] = mo;
				mo.observe(document.body, {
					childList: true,
					subtree: true,
				});
			}
		})();
	}
}
