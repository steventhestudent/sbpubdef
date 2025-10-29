// ────────────────────────────────────────────────────────────────────────────────
// Help Drawer
// ────────────────────────────────────────────────────────────────────────────────
import * as React from "react";

export function HelpDrawer({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}): JSX.Element {
	if (!open) return <></>;
	return (
		<div className="fixed inset-0 z-50">
			<div
				className="absolute inset-0 bg-black/30"
				onClick={onClose}
				aria-hidden="true"
			/>
			<aside className="absolute right-0 top-0 h-full w-[28rem] overflow-y-auto bg-white shadow-2xl">
				<div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
					<h2 className="text-base font-semibold text-slate-800">
						Help
					</h2>
					<button
						className="rounded-md border border-slate-300 px-2 py-1 text-sm"
						onClick={onClose}
					>
						Close
					</button>
				</div>
				<div className="space-y-4 p-4 text-sm text-slate-700">
					<h2>PD Content Management System (CMS)</h2>
					<p className="text-sm text-slate-600">
						Manage announcements, events, forms, trainings, and more
						across site collections.
					</p>

					<p>
						Use the tabs to manage each content type.
						&quot;Sites&quot; controls which site collections are
						queried.
					</p>
					<ol className="list-decimal space-y-1 pl-5">
						<li>Pick site collections at the top.</li>
						<li>Search and/or select content.</li>
						<li>Use bulk actions to publish or archive.</li>
					</ol>
				</div>
			</aside>
		</div>
	);
}
