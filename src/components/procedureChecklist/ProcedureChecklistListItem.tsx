import * as React from "react";
import { ProcedureChecklistItem } from "@type/ProcedureChecklist";

export const ProcedureChecklistListItem = ({
	procedure,
	onProcedureSelected,
}: {
	procedure: ProcedureChecklistItem;
	onProcedureSelected?: (proc: ProcedureChecklistItem) => void;
}) => {
	return (
		<li
			className="px-3 py-2 hover:bg-slate-50 cursor-pointer transition-colors"
			onClick={() =>
				onProcedureSelected ? onProcedureSelected(procedure) : 0
			}
		>
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-semibold text-slate-750">
						{procedure.title}
					</p>
					<p className="text-xs text-slate-600 mt-0.5">
						Category: {procedure.category} • {procedure.pageCount}{" "}
						pages
					</p>
				</div>
				<span className="text-blue-600 text-xs font-medium">
					View →
				</span>
			</div>
		</li>
	);
};
