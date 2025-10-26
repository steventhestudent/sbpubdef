import * as React from 'react';

export const WelcomeSearch: () => JSX.Element = () => (
	<form role="search" className="mx-auto max-w-lg" onSubmit={(e) => e.preventDefault()}>
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
				className="w-full rounded-l-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
				aria-expanded="false"
				name="WelcomeSearch"
			/>
			<button className="rounded-r-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700" aria-label="Run search">↠</button>
		</div>
	</form>
);
