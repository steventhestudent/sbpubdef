import * as React from "react";
import { ProcedureChecklistItem } from "@type/ProcedureChecklist";

export const ProcedureChecklistOverlay = ({
	proc,
	onClose,
	url,
}: {
	proc: ProcedureChecklistItem;
	onClose?: () => void;
	url?: string;
}) => {
	return (
		<aside className="w-full h-full fixed top-0 left-0 bg-gray-500/50 z-1">
			<div
				className="w-full h-full absolute cursor-pointer"
				onClick={onClose}
			></div>
			{url ? (
				<img
					src={url}
					className="w-[75%] absolute top-[5%] left-[12.5%]"
				/>
			) : (
				<iframe
					src={url ? url : proc.documentURL}
					className="w-[75%] h-[90%] absolute top-[5%] left-[12.5%]"
				/>
			)}
		</aside>
	);
};
