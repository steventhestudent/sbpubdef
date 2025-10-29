import * as React from "react";

export function BulkActionsBar({
	count,
	onClear,
	onPublish,
	onUnpublish,
	onDelete,
}: {
	count: number;
	onClear: () => void;
	onPublish: () => void;
	onUnpublish: () => void;
	onDelete: () => void;
}): JSX.Element {
	return (
		<div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-2 text-sm">
			<div>
				<strong>{count}</strong> selected
			</div>
			<div className="flex items-center gap-2">
				<button
					className="rounded-md border border-slate-300 px-2 py-1 hover:bg-white"
					onClick={onPublish}
				>
					Publish
				</button>
				<button
					className="rounded-md border border-slate-300 px-2 py-1 hover:bg-white"
					onClick={onUnpublish}
				>
					Unpublish
				</button>
				<button
					className="rounded-md border border-red-200 text-red-700 px-2 py-1 hover:bg-white"
					onClick={onDelete}
				>
					Delete
				</button>
				<button
					className="rounded-md border border-slate-300 px-2 py-1 hover:bg-white"
					onClick={onClear}
				>
					Clear
				</button>
			</div>
		</div>
	);
}
