import * as React from "react";

export function CMSHeader({
	onOpenHelp,
	onNewAnnouncement,
}: {
	onOpenHelp: () => void;
	onNewAnnouncement: () => void;
}): JSX.Element {
	return (
		<header className="flex flex-wrap items-center justify-between gap-3">
			<div>
				<h1 className="text-xl font-semibold text-slate-900">
					PD CMS Dashboard
				</h1>
			</div>
			<div className="flex items-center gap-2">
				<button
					className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
					onClick={onNewAnnouncement}
				>
					＋ New
					<svg
						viewBox="0 0 24 24"
						className="h-4 w-4 float-right color-gray-900 mt-1"
					>
						<path
							d="M6 9l6 6 6-6"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						/>
					</svg>
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
