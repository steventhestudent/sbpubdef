import * as React from "react";
import { ProcedureChecklistItem } from "@type/ProcedureChecklist";

export const ProcedureChecklistListItem = ({
	procedure,
	onProcedureSelected,
	onProcedureDeleted,
	editorMode = false,
}: {
	procedure: ProcedureChecklistItem;
	onProcedureSelected?: (proc: ProcedureChecklistItem) => void;
	onProcedureDeleted?: (proc: ProcedureChecklistItem) => void;
	editorMode: boolean;
}): JSX.Element => {
	return (
		<li
			title={`File:\n\t${procedure.filename}`}
			className="w-full cursor-pointer px-3 py-2 transition-colors hover:bg-slate-50"
		>
			<div className="flex w-full items-center justify-between">
				<div
					className="w-[80%] overflow-x-hidden"
					onClick={() =>
						onProcedureSelected ? onProcedureSelected(procedure) : 0
					}
				>
					<p className="text-slate-750 h-[1.2em] w-1 text-sm font-semibold overflow-ellipsis whitespace-nowrap">
						{procedure.title || procedure.filename}
					</p>
					<p className="mt-0.5 text-xs text-slate-600">
						{procedure.category} •{" "}
						<span className="text-slate-400">
							{procedure.pageCount} pages{" "}
						</span>
						{procedure.effectiveDate ? (
							<>
								•{" "}
								<span
									className="text-slate-400"
									title={`Effective: ${procedure.effectiveDate}`}
								>
									{procedure.effectiveDate.slice(-4)}
								</span>
							</>
						) : (
							<></>
						)}
					</p>
				</div>
				{editorMode ? (
					<>
						<span
							className="rounded border-1 p-0.5 text-xs font-medium whitespace-pre text-gray-500 hover:text-red-800"
							onClick={() => {
								if (
									onProcedureDeleted &&
									confirm(
										`Delete procedure '${procedure.title || procedure.filename}'?`,
									)
								)
									onProcedureDeleted(procedure);
							}}
						>
							🗑
						</span>
						<span
							className="rounded border-1 p-0.5 text-xs font-medium whitespace-pre text-gray-500 hover:text-blue-800"
							onMouseDown={(e) => {
								e.stopPropagation();
								window.open(
									`${location.origin}/sites/${ENV.HUB_NAME}/Lists/${ENV.LIST_PROCEDURECHECKLIST}/EditForm.aspx?ID=${procedure.id}`,
								);
							}}
						>
							✎
						</span>
					</>
				) : (
					<></>
				)}
				<span className="">→</span>
			</div>
		</li>
	);
};
