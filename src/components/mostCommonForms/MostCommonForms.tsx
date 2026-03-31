import * as React from "react";
import { ALL_FORMS, IFormDefinition } from "@data/MostCommonForms.mock";

const DEFAULT_VISIBLE = 4;

export function MostCommonForms(): JSX.Element {
	const [showAll, setShowAll] = React.useState(false);
	const [clicks, setClicks] = React.useState<Record<string, number>>({});

	const toggleShowAll: (e: React.MouseEvent<HTMLButtonElement>) => void = (
		e: React.MouseEvent<HTMLButtonElement>,
	): void => setShowAll(!showAll);

	const handleFormClick: (form: IFormDefinition) => void = (
		form: IFormDefinition,
	): void => {
		window.open(form.url, "_blank", "noopener,noreferrer"); // Keep cards actually clickable (even if URL 404s for now)
		// Track clicks silently – later this can drive “most common for your role
		const current = clicks[form.id] || 0;
		setClicks({
			...clicks,
			[form.id]: current + 1,
		});
		// TODO:
		//  - write these click counts to a SharePoint list (FormClickStats)
		//  - combine with user groups (Entra / AD) to choose top N per role
	};

	const getVisibleForms: () => IFormDefinition[] = (): IFormDefinition[] => {
		// For now, sort by local click count (desc), then by original order.
		const sorted = [...ALL_FORMS].sort((a, b) => {
			const ca = clicks[a.id] || 0;
			const cb = clicks[b.id] || 0;
			if (cb !== ca) return cb - ca;
			return (
				ALL_FORMS.findIndex((f) => f.id === a.id) -
				ALL_FORMS.findIndex((f) => f.id === b.id)
			);
		});

		if (showAll) {
			return sorted;
		}

		return sorted.slice(0, DEFAULT_VISIBLE);
	};
	const visibleForms = getVisibleForms();

	return (
		<div className="space-y-2">
			<div className="m-5 grid gap-3 sm:grid-cols-2">
				{visibleForms.map((form) => (
					<button
						key={form.id}
						type="button"
						onClick={() => handleFormClick(form)}
						className="flex w-full flex-col items-start rounded-md border border-slate-500 bg-white px-3 py-2 text-left text-sm hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
					>
						<span className="font-medium text-slate-900">
							{form.title}
						</span>
						{form.description && (
							<span className="mt-1 text-xs text-slate-500">
								{form.description}
							</span>
						)}
					</button>
				))}
			</div>
			<div className="mr-5 mb-2 flex items-center justify-between justify-end text-xs text-slate-500">
				{ALL_FORMS.length > DEFAULT_VISIBLE && (
					<button
						type="button"
						onClick={toggleShowAll}
						className="rounded px-1 py-0.5 text-blue-700 hover:underline focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
					>
						{showAll ? "See Less" : "See More"}
					</button>
				)}
			</div>
		</div>
	);
}
