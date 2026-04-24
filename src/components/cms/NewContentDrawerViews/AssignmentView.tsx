import * as React from "react";
import type { PNPWrapper } from "@utils/PNPWrapper";

import type { AudienceEntry } from "./types";
import { AudiencePicker } from "./AudiencePicker";

export type AssignmentFormState = {
	title: string;
	assignmentCatalogId: string;
	audience: AudienceEntry[];
	reason: string;
	assignedDate: string;
	dueDate: string;
	createCalendarEvent: boolean;
	sendEmail: boolean;
};

export function AssignmentView({
	pnpWrapper,
	value,
	onChange,
}: {
	pnpWrapper: PNPWrapper;
	value: AssignmentFormState;
	onChange: (next: AssignmentFormState) => void;
}): JSX.Element {
	return (
		<>
			<div>
				<label
					className="block text-sm font-medium text-slate-700"
					htmlFor="as-title"
				>
					Title
				</label>
				<input
					id="as-title"
					value={value.title}
					onChange={(e) => onChange({ ...value, title: e.target.value })}
					className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
				/>
			</div>

			<div>
				<label
					className="block text-sm font-medium text-slate-700"
					htmlFor="as-catalog"
				>
					AssignmentCatalogId
				</label>
				<input
					id="as-catalog"
					value={value.assignmentCatalogId}
					onChange={(e) =>
						onChange({ ...value, assignmentCatalogId: e.target.value })
					}
					className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
				/>
			</div>

			<AudiencePicker
				pnpWrapper={pnpWrapper}
				value={value.audience}
				onChange={(aud) => onChange({ ...value, audience: aud })}
				label="Audience"
				placeholder="Type 2+ letters (department or person). Tab adds."
			/>

			<div>
				<label
					className="block text-sm font-medium text-slate-700"
					htmlFor="as-reason"
				>
					Reason
				</label>
				<input
					id="as-reason"
					value={value.reason}
					onChange={(e) => onChange({ ...value, reason: e.target.value })}
					className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
				/>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div>
					<label
						className="block text-sm font-medium text-slate-700"
						htmlFor="as-assigned-date"
					>
						AssignedDate
					</label>
					<input
						id="as-assigned-date"
						type="date"
						value={value.assignedDate}
						onChange={(e) =>
							onChange({ ...value, assignedDate: e.target.value })
						}
						className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
					/>
				</div>
				<div>
					<label
						className="block text-sm font-medium text-slate-700"
						htmlFor="as-due-date"
					>
						DueDate
					</label>
					<input
						id="as-due-date"
						type="date"
						value={value.dueDate}
						onChange={(e) => onChange({ ...value, dueDate: e.target.value })}
						className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
					/>
				</div>
			</div>

			<div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
				<label
					className="flex items-center gap-2 text-sm text-slate-700"
					htmlFor="as-cal"
				>
					<input
						id="as-cal"
						type="checkbox"
						checked={value.createCalendarEvent}
						onChange={(e) =>
							onChange({ ...value, createCalendarEvent: e.target.checked })
						}
						className="h-4 w-4 rounded border-slate-300"
					/>
					<span>Create Calendar Event?</span>
				</label>
				<label
					className="flex items-center gap-2 text-sm text-slate-700"
					htmlFor="as-email"
				>
					<input
						id="as-email"
						type="checkbox"
						checked={value.sendEmail}
						onChange={(e) =>
							onChange({ ...value, sendEmail: e.target.checked })
						}
						className="h-4 w-4 rounded border-slate-300"
					/>
					<span>Send Email?</span>
				</label>
			</div>
		</>
	);
}

