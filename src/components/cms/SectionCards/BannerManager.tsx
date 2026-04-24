import * as React from "react";
import type { PNPWrapper } from "@utils/PNPWrapper";
import { SelectAllCheckbox } from "@components/cms/SelectAllCheckbox";

type BannerSettings = {
	id?: number;
	message: string;
	show: boolean;
};

export function BannerManager({
	pnpWrapper,
	selectionMode,
	selectedIds,
	onToggleSelect,
	onSelectAll,
}: {
	pnpWrapper: PNPWrapper;
	selectionMode: boolean;
	selectedIds: string[];
	onToggleSelect: (id: string) => void;
	onSelectAll: (ids: string[], select: boolean) => void;
}): JSX.Element {
	const [loading, setLoading] = React.useState(false);
	const [settings, setSettings] = React.useState<BannerSettings>({
		id: undefined,
		message: "",
		show: false,
	});

	async function load(): Promise<void> {
		setLoading(true);
		try {
			const listTitle = ENV.LIST_SITESETTINGS || "SiteSettings";
			const rows = (await pnpWrapper
				.web()
				.lists.getByTitle(listTitle)
				.items.select("Id", "BannerMessage", "ShowBanner")
				.orderBy("Id", false)
				.top(1)()) as Array<Record<string, unknown>>;
			const r = rows?.[0];
			setSettings({
				id: typeof r?.Id === "number" ? r.Id : Number(r?.Id) || undefined,
				message: typeof r?.BannerMessage === "string" ? r.BannerMessage : "",
				show:
					typeof r?.ShowBanner === "boolean"
						? r.ShowBanner
						: r?.ShowBanner !== false,
			});
		} finally {
			setLoading(false);
		}
	}

	React.useEffect(() => {
		load().catch(() => {});
	}, []);

	const rowId = settings.id ? String(settings.id) : "";
	const visibleIds = React.useMemo(() => (rowId ? [rowId] : []), [rowId]);
	const selectedVisibleCount = React.useMemo(() => {
		if (!selectionMode) return 0;
		const set = new Set(selectedIds);
		return visibleIds.reduce((acc, id) => (set.has(id) ? acc + 1 : acc), 0);
	}, [selectionMode, selectedIds, visibleIds]);
	const allSelected =
		selectionMode &&
		visibleIds.length > 0 &&
		selectedVisibleCount === visibleIds.length;
	const someSelected =
		selectionMode && selectedVisibleCount > 0 && !allSelected;

	return (
		<div className="space-y-3">
			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-slate-200">
					<thead className="bg-slate-50">
						<tr>
							{selectionMode && (
								<th className="w-10 px-3 py-2">
									<SelectAllCheckbox
										checked={Boolean(allSelected)}
										indeterminate={Boolean(someSelected)}
										onChange={(e) =>
											onSelectAll(
												visibleIds,
												e.target.checked,
											)
										}
										ariaLabel="Select banner settings"
									/>
								</th>
							)}
							{["ID", "ShowBanner", "BannerMessage"].map((h) => (
								<th
									key={h}
									className="px-4 py-2 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase"
								>
									{h}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-200">
						<tr className="hover:bg-slate-50">
							{selectionMode && (
								<td className="px-3 py-3">
									<input
										type="checkbox"
										checked={
											rowId
												? selectedIds?.includes(rowId)
												: false
										}
										onChange={() => {
											if (!rowId) return;
											onToggleSelect(rowId);
										}}
										disabled={!rowId}
										aria-label="Select banner row"
									/>
								</td>
							)}
							<td className="px-4 py-3 text-xs text-slate-600">
								{rowId ? `#${rowId}` : "—"}
							</td>
							<td className="px-4 py-3 text-sm text-slate-700">
								{settings.show ? "true" : "false"}
							</td>
							<td className="px-4 py-3 text-sm text-slate-700">
								{settings.message ? (
									<div
										className="max-w-[48rem] whitespace-pre-wrap"
										dangerouslySetInnerHTML={{
											__html: settings.message,
										}}
									/>
								) : (
									<span className="text-slate-500 italic">
										(empty)
									</span>
								)}
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div className="flex items-center justify-end">
				<button
					className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-white disabled:opacity-50"
					onClick={() => {
						load().catch(() => {});
					}}
					disabled={loading}
				>
					{loading ? "Loading…" : "Refresh"}
				</button>
			</div>
		</div>
	);
}

