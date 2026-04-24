import * as React from "react";
import { ENV_ROLE_DISPLAY } from "@utils/rolebased/ENV";

export default function RoleFormField({
	value,
	onChange,
}: {
	value?: string;
	onChange?: React.ChangeEventHandler<HTMLSelectElement>;
}) {
	return (
		<div>
			<label
				className="block text-sm font-medium text-slate-700"
				htmlFor="ann-dept"
			>
				PD Department
			</label>
			<select
				id="ann-dept"
				value={value}
				onChange={onChange}
				className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
			>
				{ENV.ROLESELECT_ORDER.split(" ").map((rk, i) => (
					<option key={i} value={rk}>
						{ENV_ROLE_DISPLAY(rk)}
					</option>
				))}
			</select>
		</div>
	);
}
