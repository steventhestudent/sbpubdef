import { Log } from "@microsoft/sp-core-library";
import { BaseApplicationCustomizer } from "@microsoft/sp-application-base";
import * as strings from "ThemeInjectorApplicationCustomizerStrings";
import "@styles/SharePointStyleOverride.css";
import "@styles/scrollbar-thin.css";
import "@dist/tailwind.css"; // to do: comment out in production? (do webparts all include a copy of it!?)

export default class ThemeInjectorApplicationCustomizer extends BaseApplicationCustomizer<{}> {
	public async onInit(): Promise<void> {
		Log.info(
			"ThemeInjectorApplicationCustomizer",
			`Initialized ${strings.Title}`,
		);
		console.log(`themeInjector.properties:`, this.properties);

		/*
			DismissibleAnnouncementStrip
		*/
		function DismissibleAnnouncementStrip(): HTMLDivElement {
			const strip = document.createElement("div");
			strip.appendChild(
				document.createTextNode(
					"Covid-19 message / wash your hands! The wifi password is: (Click me)",
				),
			);
			strip.id = "DismissibleAnnouncementStrip";
			strip.style.textAlign = "center";
			strip.style.backgroundColor = "rgb(183, 183, 183)";
			strip.style.color = "black";
			strip.style.padding = "4px";
			strip.style.cursor = "pointer";
			if (
				localStorage.getItem(
					"ThemeInjector.DismissibleAnnouncementStripCollapsed",
				)
			)
				strip.style.height = "5px";
			strip.addEventListener("click", (event: MouseEvent) => {
				if (strip.style.height)
					localStorage.removeItem(
						"ThemeInjector.DismissibleAnnouncementStripCollapsed",
					);
				else
					localStorage.setItem(
						"ThemeInjector.DismissibleAnnouncementStripCollapsed",
						"true",
					);
				strip.style.fontSize = strip.style.height ? "" : "0px";
				strip.className = strip.style.height ? "" : "collapsed";
				strip.style.height = strip.style.height ? "" : "5px";
			});
			return strip;
		}
		const getCanvasComponent: () => HTMLElement | null = () =>
			document.querySelector(".CanvasComponent");
		const stripInsertion: () => void = () =>
			getCanvasComponent()?.parentNode!.insertBefore(
				DismissibleAnnouncementStrip(),
				getCanvasComponent(),
			);
		(function pollInsert() {
			if (!getCanvasComponent()) setTimeout(pollInsert, 333);
			else setTimeout(stripInsertion, 666);
		})();

		/*
			Compact Mode
		*/
		function addCompactModeStylesheet(): void {
			const stylesheet = document.createElement("style");
			stylesheet.id = "themeInjector.CompactModeStylesheet";
			stylesheet.appendChild(
				document.createTextNode(`
					.CanvasZone {padding: 0 !important;}
					.CanvasZoneSectionContainer .CanvasSection {padding: 0 !important;}
					.CanvasSection .ControlZone {margin: 0 !important; padding: 0 !important;}
					
					#DismissibleAnnouncementStrip.collapsed {margin-top: 4px; margin-bottom: 4px;}
				`),
			);
			document.head.appendChild(stylesheet);
		}
		function toggleCompactModeStylesheet(e: MouseEvent): void {
			document
				.querySelectorAll(
					".CanvasZone, .CanvasZoneSectionContainer .CanvasSection, .CanvasSection .ControlZone",
				)
				.forEach((el: HTMLElement) => {
					el.style.transition =
						"margin 200ms ease-in-out, padding 200ms ease-in-out";
				});
			setTimeout(() => updateTooltip(e.target as HTMLButtonElement));
			if (
				document.querySelector("#themeInjector\\.CompactModeStylesheet")
			) {
				(e.target as HTMLButtonElement).innerText = "🔳";
				localStorage.setItem("ThemeInjector.MarginModeFlag", "true");
				return document
					.querySelector("#themeInjector\\.CompactModeStylesheet")
					?.remove();
			}
			localStorage.removeItem("ThemeInjector.MarginModeFlag");
			(e.target as HTMLButtonElement).innerText = "◼️️";
			addCompactModeStylesheet();
		}
		function updateTooltip(btn: HTMLButtonElement): void {
			btn.title =
				(document.querySelector(
					"#themeInjector\\.CompactModeStylesheet",
				)
					? "Compact Mode"
					: "SharePoint Mode") +
				" —  Toggle Webpart Margin / Padding (ThemeInjector.CompactModeStylesheet)";
		}
		function CompactModeBtn(): HTMLButtonElement {
			const btn = document.createElement("button");
			btn.innerText = document.querySelector(
				"#themeInjector\\.CompactModeStylesheet",
			)
				? "◼️"
				: "🔳";
			btn.style.fontSize = "18px";
			btn.style.cursor = "pointer";
			btn.style.textShadow = "0 0 4px #03787c";
			btn.style.opacity = "0.75";
			updateTooltip(btn);
			btn.addEventListener("click", toggleCompactModeStylesheet);
			return btn;
		}
		const getToolbar: () => HTMLElement | null = () =>
			document.querySelector(
				".fui-Toolbar .ms-OverflowSet:last-of-type, .fui-FluentProvider .ms-OverflowSet:last-of-type",
			); // add after ↙↗ 'Expand Content' btn. fui-FluentProvider = Site Contents view
		const toolbarInsertion: () => void = () =>
			getToolbar()?.appendChild(CompactModeBtn());
		(function pollInsert() {
			if (!getToolbar()) setTimeout(pollInsert, 333);
			else setTimeout(toolbarInsertion, 666);
		})();
		if (!localStorage.getItem("ThemeInjector.MarginModeFlag"))
			addCompactModeStylesheet();

		return Promise.resolve();
	}
}
