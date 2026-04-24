import * as React from "react";

export type AssignmentCatalogFormState = {
	title: string;
	assignmentKey: string;
	assignmentType: string;
	category: string;
	summary: string;
	instructions: string;
	active: boolean;
	targetRolesText: string;
	dueDaysAfterAssigned?: number;
	createCalendarEvent: boolean;
	sendAssignmentEmail: boolean;
	displayOrder?: number;
	estimatedMinutes?: number;
	finalStepCompletionMode: string;
	contentVersion?: string | number;
	quizPassingScore?: number;
};

export function AssignmentCatalogView({
	value,
	onChange,
}: {
	value: AssignmentCatalogFormState;
	onChange: (next: AssignmentCatalogFormState) => void;
}): JSX.Element {
	return (
		<div className="space-y-3">
			<div>
				<label className="block text-sm font-medium text-slate-700" htmlFor="ac-title">
					Title
				</label>
				<input
					id="ac-title"
					value={value.title}
					onChange={(e) => onChange({ ...value, title: e.target.value })}
					className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
				/>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div>
					<label className="block text-sm font-medium text-slate-700" htmlFor="ac-key">
						AssignmentKey
					</label>
					<input
						id="ac-key"
						value={value.assignmentKey}
						onChange={(e) => onChange({ ...value, assignmentKey: e.target.value })}
						className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-slate-700" htmlFor="ac-type">
						AssignmentType
					</label>
					<input
						id="ac-type"
						value={value.assignmentType}
						onChange={(e) => onChange({ ...value, assignmentType: e.target.value })}
						className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
					/>
				</div>
			</div>

			<div>
				<label className="block text-sm font-medium text-slate-700" htmlFor="ac-category">
					Category
				</label>
				<input
					id="ac-category"
					value={value.category}
					onChange={(e) => onChange({ ...value, category: e.target.value })}
					className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
				/>
			</div>

			<div>
				<label className="block text-sm font-medium text-slate-700" htmlFor="ac-summary">
					Summary
				</label>
				<textarea
					id="ac-summary"
					value={value.summary}
					onChange={(e) => onChange({ ...value, summary: e.target.value })}
					rows={3}
					className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
				/>
			</div>

			<div>
				<label className="block text-sm font-medium text-slate-700" htmlFor="ac-instructions">
					Instructions
				</label>
				<textarea
					id="ac-instructions"
					value={value.instructions}
					onChange={(e) => onChange({ ...value, instructions: e.target.value })}
					rows={5}
					className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
				/>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<label className="flex items-center gap-2 text-sm text-slate-700" htmlFor="ac-active">
					<input
						id="ac-active"
						type="checkbox"
						checked={value.active}
						onChange={(e) => onChange({ ...value, active: e.target.checked })}
						className="h-4 w-4 rounded border-slate-300"
					/>
					<span>Active</span>
				</label>
				<label className="flex items-center gap-2 text-sm text-slate-700" htmlFor="ac-email">
					<input
						id="ac-email"
						type="checkbox"
						checked={value.sendAssignmentEmail}
						onChange={(e) => onChange({ ...value, sendAssignmentEmail: e.target.checked })}
						className="h-4 w-4 rounded border-slate-300"
					/>
					<span>SendAssignmentEmail</span>
				</label>
			</div>
		</div>
	);
}

