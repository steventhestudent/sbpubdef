import { spfi, SPFI, SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import type { ApplicationCustomizerContext } from "@microsoft/sp-application-base";

interface IBannerSettings {
	BannerMessage: string;
	ShowBanner: boolean;
}

async function fetchBannerSettings(context: ApplicationCustomizerContext): Promise<IBannerSettings | null> {
	try {
		const sp: SPFI = spfi().using(SPFx(context));
		const items = await sp.web.lists
			.getByTitle("SiteSettings")
			.items.select("BannerMessage", "ShowBanner")
			.top(1)();
		
		if (items.length > 0) {
			return {
				BannerMessage: items[0].BannerMessage || "",
				ShowBanner: items[0].ShowBanner !== false,
			};
		}
		return null;
	} catch (error) {
		console.error("Failed to fetch banner settings:", error);
		return null;
	}
}

export async function DismissibleAnnouncementStrip(context: ApplicationCustomizerContext): Promise<void> {
	if (document.querySelector("#DismissibleAnnouncementStrip")) return;

	const settings = await fetchBannerSettings(context);
	
	if (!settings || !settings.ShowBanner || !settings.BannerMessage) {
		return; // Don't show banner if disabled or no message
	}

	function createStrip(): HTMLDivElement {
		const strip = document.createElement("div");
		strip.appendChild(document.createTextNode(settings!.BannerMessage));
		strip.id = "DismissibleAnnouncementStrip";
		strip.style.textAlign = "center";
		strip.style.backgroundColor = "rgb(183, 183, 183)";
		strip.style.color = "black";
		strip.style.padding = "4px";
		strip.style.cursor = "pointer";
		strip.style.overflow = "hidden";
		
		if (
			localStorage.getItem(
				"ThemeInjector.DismissibleAnnouncementStripCollapsed",
			)
		) {
			strip.style.height = "5px";
		}
		
		strip.addEventListener("click", (event: MouseEvent) => {
			if (strip.style.height) {
				localStorage.removeItem(
					"ThemeInjector.DismissibleAnnouncementStripCollapsed",
				);
			} else {
				localStorage.setItem(
					"ThemeInjector.DismissibleAnnouncementStripCollapsed",
					"true",
				);
			}
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
			createStrip(),
			getCanvasComponent(),
		);
		
	(function pollInsert() {
		if (!getCanvasComponent()) setTimeout(pollInsert, 333);
		else setTimeout(stripInsertion, 0);
	})();
}