import * as React from "react";

export default function ClearableInput({
	placeholder,
	onChange,
	onFocus,
}: {
	placeholder?: string;
	onChange?: (
		e:
			| React.ChangeEvent<HTMLInputElement>
			| React.MouseEvent<HTMLButtonElement>,
	) => void;
	onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
}): JSX.Element {
	const [value, setValue] = React.useState("");
	return (
		<div className="relative w-full">
			<input
				type="search"
				className="w-full rounded-md border border-slate-500 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
				placeholder={placeholder || ""}
				value={value}
				onChange={(e) => {
					setValue(e.target.value);
					if (onChange) onChange(e);
				}}
				onFocus={(e) => onFocus?.(e)}
			/>
			{value ? (
				<button
					type="button"
					className="absolute right-[0.1em] mt-[0.666em] rounded-md border-slate-300 px-3 text-sm font-bold text-white opacity-60 hover:opacity-100"
					aria-label="Clear search"
					onClick={(e) => {
						setValue("");
						if (onChange) onChange(e);
					}}
				>
					Ⓧ
				</button>
			) : (
				<></>
			)}
		</div>
	);
}
