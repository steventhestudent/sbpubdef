import * as React from "react";
import { PNPWrapper } from "@utils/PNPWrapper";
import { NewPDContentDrawer } from "@components/cms/NewPDContentDrawer";

export function NewPDAnnouncementDrawer({
	open,
	onClose,
	onOpenHelp,
	onSubmit, // legacy (unused)
	pnpWrapper,
}: {
	open: boolean;
	onClose: () => void;
	onOpenHelp: () => void;
	onSubmit?: (payload: { title: string; department: string; html: string }) => void;
	pnpWrapper?: PNPWrapper;
}): JSX.Element {
	if (!pnpWrapper) return open ? <></> : <></>;
	return (
		<NewPDContentDrawer
			open={open}
			onClose={onClose}
			onOpenHelp={onOpenHelp}
			pnpWrapper={pnpWrapper}
			defaultContentType="announcement"
		/>
	);
}
