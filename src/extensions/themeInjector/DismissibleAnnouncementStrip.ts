export function DismissibleAnnouncementStrip(): void {
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
		else setTimeout(stripInsertion, 0);
	})();
}
