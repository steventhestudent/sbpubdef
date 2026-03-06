import * as React from "react";
import { ProcedureChecklistItem } from "@type/ProcedureChecklist";

export const ProcedureChecklistOverlay = ({
	proc,
	onClose,
	url,
}: {
	proc?: ProcedureChecklistItem;
	onClose?: () => void;
	url?: string;
}): JSX.Element => {
	return (
		<aside className="fixed top-0 left-0 z-1 h-full w-full bg-gray-500/50">
			<div
				className="absolute h-full w-full cursor-pointer"
				onClick={onClose}
			/>
			{url ? (
				<img
					src={url}
					className="absolute top-[5%] left-[12.5%] w-[75%]"
				/>
			) : (
				<iframe
					src={url ? url : proc && proc.documentURL}
					className="absolute top-[5%] left-[12.5%] h-[90%] w-[75%]"
				/>
			)}
		</aside>
	);
};
