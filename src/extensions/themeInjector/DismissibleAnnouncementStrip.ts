import { spfi, SPFI, SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import type { ApplicationCustomizerContext } from "@microsoft/sp-application-base";

interface IBannerSettings {
	BannerMessage: string;
	ShowBanner: boolean;
}

async function fetchBannerSettings(
	context: ApplicationCustomizerContext,
): Promise<IBannerSettings | undefined> {
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
		return undefined;
	} catch (error) {
		console.error("Failed to fetch banner settings:", error);
		return undefined;
	}
}

export async function DismissibleAnnouncementStrip(
	context: ApplicationCustomizerContext,
): Promise<void> {
	if (document.querySelector("#DismissibleAnnouncementStrip")) return;

	const settings = await fetchBannerSettings(context);

	if (!settings || !settings.ShowBanner || !settings.BannerMessage) {
		return; // Don't show banner if disabled or no message
	}

	function createStrip(): HTMLDivElement {
		document.querySelector("#DismissibleAnnouncementStrip")?.remove();
		const strip = document.createElement("div");
		strip.innerHTML = settings!.BannerMessage;
		(function removeFontColor(node: HTMLDivElement) {
			if (node.style) node.style.color = "";
			for (let child of Array.from(node.children))
				removeFontColor(child as HTMLDivElement);
		})(strip);
		strip.id = "DismissibleAnnouncementStrip";
		strip.style.textAlign = "center";
		strip.style.backgroundColor = "rgb(0, 90, 158)";
		strip.style.color = "white";
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
