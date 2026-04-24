import * as React from "react";

export function SelectAllCheckbox({
	checked,
	indeterminate,
	onChange,
	ariaLabel = "Select all",
}: {
	checked: boolean;
	indeterminate: boolean;
	onChange: React.ChangeEventHandler<HTMLInputElement>;
	ariaLabel?: string;
}): JSX.Element {
	const ref = React.useRef<HTMLInputElement | null>(null);

	React.useEffect(() => {
		if (!ref.current) return;
		ref.current.indeterminate = indeterminate;
	}, [indeterminate]);

	return (
		<input
			ref={ref}
			type="checkbox"
			checked={checked}
			onChange={onChange}
			aria-label={ariaLabel}
		/>
	);
}

