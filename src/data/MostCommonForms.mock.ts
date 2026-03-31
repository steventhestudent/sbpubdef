export interface IFormDefinition {
	id: string;
	title: string;
	description?: string;
	url: string;
}

/**
 * Dummy catalog of forms.
 * These URLs can 404 for now – they’re just placeholders to keep cards clickable.
 */
export const ALL_FORMS: IFormDefinition[] = [
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
