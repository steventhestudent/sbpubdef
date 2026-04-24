import * as React from "react";

export type BannerFormState = {
	showBanner: boolean;
	bannerMessageHtml: string;
};

export function BannerView({
	value,
	onChange,
}: {
	value: BannerFormState;
	onChange: (next: BannerFormState) => void;
}): JSX.Element {
	return (
		<div className="space-y-3">
			<label
				className="flex items-center gap-2 text-sm text-slate-700"
				htmlFor="banner-show"
			>
				<input
					id="banner-show"
					type="checkbox"
					checked={value.showBanner}
					onChange={(e) =>
						onChange({ ...value, showBanner: e.target.checked })
					}
					className="h-4 w-4 rounded border-slate-300"
				/>
				<span>Show banner</span>
			</label>

			<div>
				<label
					className="block text-sm font-medium text-slate-700"
					htmlFor="banner-message"
				>
					Banner message (HTML)
				</label>
				<textarea
					id="banner-message"
					value={value.bannerMessageHtml}
					onChange={(e) =>
						onChange({ ...value, bannerMessageHtml: e.target.value })
					}
					rows={6}
					className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
				/>
				<div className="mt-2 rounded-md border border-slate-200 bg-white p-2">
					<div className="text-xs font-semibold text-slate-600">Preview</div>
					<div
						className="mt-1 text-sm text-slate-700"
						dangerouslySetInnerHTML={{ __html: value.bannerMessageHtml }}
					/>
				</div>
			</div>
		</div>
	);
}

