export function CompactMode(): void {
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
		if (document.querySelector("#themeInjector\\.CompactModeStylesheet")) {
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
			(document.querySelector("#themeInjector\\.CompactModeStylesheet")
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
}
