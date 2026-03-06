import * as React from "react";
import { ProcedureChecklistItem } from "@type/ProcedureChecklist";

export const ProcedureChecklistListItem = ({
	procedure,
	onProcedureSelected,
}: {
	procedure: ProcedureChecklistItem;
	onProcedureSelected?: (proc: ProcedureChecklistItem) => void;
}): JSX.Element => {
	return (
		<li
			className="w-full cursor-pointer px-3 py-2 transition-colors hover:bg-slate-50"
			onClick={() =>
				onProcedureSelected ? onProcedureSelected(procedure) : 0
			}
		>
			<div className="flex w-full items-center justify-between">
				<div className="w-[80%] overflow-x-hidden">
					<p className="text-slate-750 h-[1.2em] w-1 text-sm font-semibold overflow-ellipsis whitespace-nowrap">
						{procedure.title || procedure.filename}
					</p>
					<p className="mt-0.5 text-xs text-slate-600">
						{procedure.category} • {procedure.pageCount} pages
					</p>
				</div>
				<span className="m-[-2em] mr-[-0.5em] rounded border-1 p-1 text-xs font-medium whitespace-pre text-blue-800">
					View →
				</span>
			</div>
		</li>
	);
};
