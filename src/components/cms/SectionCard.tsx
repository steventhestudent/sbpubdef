import * as React from "react";

export function SectionCard({
	title,
	children,
}: React.PropsWithChildren<{ title: string }>): JSX.Element {
	return (
		<section className="rounded-xl border border-slate-200">
			<header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
				<h2 className="text-base font-semibold text-slate-800">
					{title}
				</h2>
			</header>
			<div className="p-4">{children}</div>
		</section>
	);
}
