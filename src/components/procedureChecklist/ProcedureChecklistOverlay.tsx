import * as React from "react";
import { ProcedureChecklistItem } from "@type/ProcedureChecklist";

export const ProcedureChecklistOverlay = ({
	proc,
	onClose,
}: {
	proc: ProcedureChecklistItem;
	onClose?: () => void;
}) => {
	return (
		<aside className="w-full h-full fixed top-0 left-0 bg-gray-500/50">
			<div
				className="w-full h-full absolute cursor-pointer"
				onClick={onClose}
			></div>
			<iframe
				src={proc.documentURL}
				className="w-[75%] h-[90%] absolute top-[5%] left-[12.5%]"
			/>
		</aside>
	);
};
