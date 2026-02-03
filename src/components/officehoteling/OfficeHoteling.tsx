import * as React from "react";
import { OfficeHotelingDrawer } from "@components/officehoteling/OfficeHotelingDrawer";

export function OfficeHoteling(): JSX.Element {
	const [open, setOpen] = React.useState(false);
	return (
		<div>
			<OfficeHotelingDrawer open={open} onClose={() => setOpen(false)} />
			<span
				className="absolute right-5 bottom-[1.2em] text-blue-600 hover:underline cursor-pointer"
				onClick={() => setOpen(true)}
			>
				Reservations (0)
			</span>
		</div>
	);
}
