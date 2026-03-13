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
		<aside className="fixed top-0 left-0 z-[9999] h-full w-full bg-gray-500/50">
			<div className="relative h-full w-full" onClick={onClose}>
				{url ? (
					<div className="flex h-full w-full items-center justify-center">
						<img
							src={url}
							className="max-h-full max-w-full outline-8"
							alt="Procedure Checklist"
						/>
					</div>
				) : (
					<iframe
						src={url ? url : proc && proc.documentURL}
						className="absolute top-[5%] left-[12.5%] h-[90%] w-[75%]"
					/>
				)}
			</div>
		</aside>
	);
};
