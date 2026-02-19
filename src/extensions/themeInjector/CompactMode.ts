function addCompactModeStylesheet(): void {
	const stylesheet = document.createElement("style");
	stylesheet.id = "themeInjector.CompactModeStylesheet";
	stylesheet.appendChild(
		document.createTextNode(`
					.CanvasSection .ControlZone {margin: 0 !important;}
					#DismissibleAnnouncementStrip.collapsed {margin-top: 4px; margin-bottom: 4px;}
					footer {margin-top: 5px !important;}
					/* hide sidebar */
					#sp-appBar {display: none !important;}
				`),
	);
	document.head.appendChild(stylesheet);
}

function addHalfCompactModeStylesheet(): void {
	const stylesheet = document.createElement("style");
	stylesheet.id = "themeInjector.HalfCompactModeStylesheet";
	stylesheet.appendChild(
		document.createTextNode(`
					.CanvasSection .ControlZone {margin: 8px !important;}
					#DismissibleAnnouncementStrip.collapsed {margin-top: 4px; margin-bottom: 4px;}
					/* hide sidebar */
					#sp-appBar {display: none !important;}
				`),
	);
	document.head.appendChild(stylesheet);
}

function addAlwaysZeroPaddingStylesheet(): void {
	const stylesheet = document.createElement("style");
	stylesheet.id = "themeInjector.AlwaysZeroPaddingStylesheet";
	stylesheet.appendChild(
		document.createTextNode(`
					.CanvasZone {padding: 0px !important;}
					.CanvasZoneSectionContainer .CanvasSection {padding: 0px !important;}
					.CanvasSection .ControlZone {padding: 0px !important; margin: 16px !important;}
					/* hide hub navigation */
					.ms-HubNav {display: none !important;}
				`),
	);
	document.head.appendChild(stylesheet);
}

export function CompactMode(): void {
	addAlwaysZeroPaddingStylesheet();
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
			document.querySelector("#themeInjector\\.HalfCompactModeStylesheet")
		) {
			(e.target as HTMLButtonElement).innerText = "◼️️";
			localStorage.setItem("ThemeInjector.MarginModeFlag", "0");
			addCompactModeStylesheet();
			return document
				.querySelector("#themeInjector\\.HalfCompactModeStylesheet")
				?.remove();
		}
		if (document.querySelector("#themeInjector\\.CompactModeStylesheet")) {
			(e.target as HTMLButtonElement).innerText = "🔳";
			localStorage.setItem("ThemeInjector.MarginModeFlag", "2");
			return document
				.querySelector("#themeInjector\\.CompactModeStylesheet")
				?.remove();
		}
		localStorage.setItem("ThemeInjector.MarginModeFlag", "1");
		(e.target as HTMLButtonElement).innerText = "🔳";
		addHalfCompactModeStylesheet();
	}

	function updateTooltip(btn: HTMLButtonElement): void {
		btn.title =
			(document.querySelector("#themeInjector\\.CompactModeStylesheet")
				? "Compact Mode"
				: "SharePoint Mode (1 or 2)") +
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
		btn.style.setProperty("background-color", "white", "important");
		btn.style.setProperty("margin-left", "0.4em", "important");
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
	const marginFlag =
		localStorage.getItem("ThemeInjector.MarginModeFlag") === null
			? 1
			: Number(localStorage.getItem("ThemeInjector.MarginModeFlag"));
	if (marginFlag === 1) addHalfCompactModeStylesheet();
	else if (marginFlag === 0) addCompactModeStylesheet();
}
