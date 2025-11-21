import * as React from "react";
import type { IMostCommonFormsProps } from "./IMostCommonFormsProps";
import { Collapsible } from "@components/Collapsible";

interface IFormDefinition {
	id: string;
	title: string;
	description?: string;
	url: string;
}

interface IMostCommonFormsState {
	clicks: Record<string, number>;
	showAll: boolean;
}

/**
 * Dummy catalog of forms.
 * These URLs can 404 for now – they’re just placeholders to keep cards clickable.
 */
const ALL_FORMS: IFormDefinition[] = [
	{
		id: "timeOff",
		title: "Time Off Request",
		description: "Opens form",
		url: "https://csproject25.sharepoint.com/sites/PD-Intranet/Forms/TimeOffRequest.aspx",
	},
	{
		id: "mileage",
		title: "Mileage Reimbursement",
		description: "Opens form",
		url: "https://csproject25.sharepoint.com/sites/PD-Intranet/Forms/MileageReimbursement.aspx",
	},
	{
		id: "travel",
		title: "Travel Authorization",
		description: "Opens form",
		url: "https://csproject25.sharepoint.com/sites/PD-Intranet/Forms/TravelAuthorization.aspx",
	},
	{
		id: "equipment",
		title: "Equipment Request",
		description: "Opens form",
		url: "https://csproject25.sharepoint.com/sites/PD-Intranet/Forms/EquipmentRequest.aspx",
	},
	{
		id: "training",
		title: "Training Request",
		description: "Opens form",
		url: "https://csproject25.sharepoint.com/sites/PD-Intranet/Forms/TrainingRequest.aspx",
	},
	{
		id: "parking",
		title: "Parking Request",
		description: "Opens form",
		url: "https://csproject25.sharepoint.com/sites/PD-Intranet/Forms/ParkingRequest.aspx",
	},
];

const DEFAULT_VISIBLE = 4;

export default class MostCommonForms extends React.Component<
	IMostCommonFormsProps,
	IMostCommonFormsState
> {
	public constructor(props: IMostCommonFormsProps) {
		super(props);

		this.state = {
			clicks: {},
			showAll: false,
		};

		this.handleFormClick = this.handleFormClick.bind(this);
		this.toggleShowAll = this.toggleShowAll.bind(this);
	}

	private toggleShowAll(): void {
		this.setState((prev) => ({ showAll: !prev.showAll }));
	}

	private handleFormClick(form: IFormDefinition): void {
		// Keep cards actually clickable (even if URL 404s for now)
		window.open(form.url, "_blank", "noopener,noreferrer");

		// Track clicks silently – later this can drive “most common for your role”
		this.setState((prev) => {
			const current = prev.clicks[form.id] || 0;
			return {
				clicks: {
					...prev.clicks,
					[form.id]: current + 1,
				},
			};
		});

		// TODO:
		//  - write these click counts to a SharePoint list (FormClickStats)
		//  - combine with user groups (Entra / AD) to choose top N per role
	}

	private getVisibleForms(): IFormDefinition[] {
		const { clicks, showAll } = this.state;

		// For now, sort by local click count (desc), then by original order.
		const sorted = [...ALL_FORMS].sort((a, b) => {
			const ca = clicks[a.id] || 0;
			const cb = clicks[b.id] || 0;
			if (cb !== ca) return cb - ca;
			return (
				ALL_FORMS.findIndex((f) => f.id === a.id) -
				ALL_FORMS.findIndex((f) => f.id === b.id)
			);
		});

		if (showAll) {
			return sorted;
		}

		return sorted.slice(0, DEFAULT_VISIBLE);
	}

	public render(): React.ReactElement<IMostCommonFormsProps> {
		const { showAll } = this.state;
		const visibleForms = this.getVisibleForms();

		return (
			<Collapsible
				instanceId={this.props.context.instanceId}
				title="Most Common Forms"
			>
				<div className="space-y-2">
					<div className="grid gap-3 sm:grid-cols-2 m-5">
						{visibleForms.map((form) => (
							<button
								key={form.id}
								type="button"
								onClick={() => this.handleFormClick(form)}
								className="flex w-full flex-col items-start rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
							>
								<span className="font-medium text-slate-900">
									{form.title}
								</span>
								{form.description && (
									<span className="mt-1 text-xs text-slate-500">
										{form.description}
									</span>
								)}
							</button>
						))}
					</div>
					<div className="flex items-center justify-between text-xs text-slate-500 justify-end mr-5 mb-2">
						{ALL_FORMS.length > DEFAULT_VISIBLE && (
							<button
								type="button"
								onClick={this.toggleShowAll}
								className="text-blue-700 hover:underline px-1 py-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
							>
								{showAll ? "See Less" : "See More"}
							</button>
						)}
					</div>
				</div>
			</Collapsible>
		);
	}
}
