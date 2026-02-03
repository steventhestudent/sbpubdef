import * as React from "react";

export function OfficeHotelingDrawer({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}): JSX.Element {
	// React.useEffect(() => {
	// 	if (open) setTitle("");
	// }, [open]);

	if (!open) return <></>;

	return (
		<div className="fixed inset-0 z-40">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/30"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Drawer (right). HelpDrawer uses z-50, so it will appear above this if opened */}
			<aside className="absolute right-0 bottom-0 h-[calc(100%-48px)] w-[36rem] overflow-y-auto bg-white shadow-2xl">
				<header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
					<h2 className="text-base font-semibold text-slate-800">
						Office Hoteling
					</h2>
					<div className="flex items-center gap-2">
						<button
							className="rounded-md border border-slate-300 px-2 py-1 text-sm"
							onClick={onClose}
						>
							Close
						</button>
					</div>
				</header>
				<div className="space-y-4 p-4">
					<select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
						<option>Location 1</option>
					</select>
				</div>
			</aside>
		</div>
	);
}
