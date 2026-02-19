import * as React from "react";
export const WelcomeSearch: () => JSX.Element = () => {
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
		e.preventDefault();

		const form = e.currentTarget;
		const input = form.querySelector(
			'input[name="WelcomeSearch"]',
		) as HTMLInputElement;
		const query = input.value.trim();

		if (!query) return;
		// window.location.href = `/sites/PD-Intranet/search/pages/results.aspx?k=${encodeURIComponent(query)}`;
		window.location.href = `/sites/PD-Intranet/_layouts/15/search.aspx/siteall?q=${encodeURIComponent(query)}`;
	};

	return (
		<form
			role="search"
			className="mx-auto max-w-lg"
			onSubmit={handleSubmit}
		>
			<div className="flex">
				<input
					role="combobox"
					type="search"
					aria-autocomplete="list"
					aria-controls="ms-searchux-popup-0"
					accessKey="S"
					spellCheck={false}
					autoComplete="off"
					autoCorrect="off"
					data-nav="true"
					data-tab="true"
					maxLength={500}
					placeholder="Search…"
					className="w-full rounded-l-md border border-slate-500 hover:border-slate-800 px-3 py-2 text-sm focus:outline-none bg-white"
					aria-expanded="false"
					name="WelcomeSearch"
				/>
				<button
					type="submit"
					className="rounded-r-md bg-[#0078D4] px-4 text-sm font-medium text-white hover:bg-[#005a9e] font-bold transition-colors duration-100"
					aria-label="Run search"
				>
					🔍
				</button>
			</div>
		</form>
	);
};
