import * as React from "react";

export function CMSHeader({
	onOpenHelp,
}: {
	onOpenHelp: () => void;
}): JSX.Element {
	return (
		<header className="flex flex-wrap items-center justify-between gap-3">
			<div>
				<h1 className="text-xl font-semibold text-slate-900">
					PD CMS Dashboard
				</h1>
			</div>
			<div className="flex items-center gap-2">
				<button className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
					New…
				</button>
				<button className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
					Settings
				</button>
				<button
					className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
					onClick={onOpenHelp}
				>
					Help
				</button>
			</div>
		</header>
	);
}
