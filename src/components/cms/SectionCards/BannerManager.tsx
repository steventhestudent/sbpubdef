import * as React from "react";
import type { PNPWrapper } from "@utils/PNPWrapper";

type BannerSettings = {
	id?: number;
	message: string;
	show: boolean;
};

export function BannerManager({
	pnpWrapper,
}: {
	pnpWrapper: PNPWrapper;
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

	return (
		<div className="space-y-3">
			<div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
				<div className="text-sm text-slate-700">
					<div>
						<b>ShowBanner</b>: {settings.show ? "true" : "false"}
					</div>
					<div className="mt-2">
						<b>BannerMessage</b>:
						<div className="mt-1 rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-700">
							{settings.message ? (
								<div dangerouslySetInnerHTML={{ __html: settings.message }} />
							) : (
								<span className="text-slate-500 italic">(empty)</span>
							)}
						</div>
					</div>
				</div>
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

