import * as React from "react";

export function TabButton({
	id,
	title,
	active,
	onClick,
}: {
	id: string;
	title: string;
	active?: boolean;
	onClick: () => void;
}): JSX.Element {
	return (
		<button
			id={`tab-${id}`}
			role="tab"
			aria-selected={!!active}
			onClick={onClick}
			className={[
				"rounded-full border px-3 py-1 text-sm",
				active
					? "border-blue-600 bg-blue-600 text-white"
					: "border-slate-300 text-slate-700 hover:bg-slate-50",
			].join(" ")}
		>
			{title}
		</button>
	);
}
