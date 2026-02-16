export interface IProcedure {
	id: number;
	title: string;
	category: string;
	totalSteps: number;
	pdfUrl: string;
}

export interface IProcedureStep {
	procedureId: number;
	stepNumber: number;
	imageUrl: string;
	description: string;
}

export const SAMPLE_PROCEDURES: IProcedure[] = [
	{
		id: 1,
		title: "Post-Sentencing Status in e-Defender",
		category: "LOP",
		totalSteps: 4,
		pdfUrl: "/sample-pdfs/post-sentencing-status.pdf",
	},
	{
		id: 2,
		title: "Discovery Email Processing",
		category: "Reception",
		totalSteps: 5,
		pdfUrl: "/sample-pdfs/discovery-email-processing.pdf",
	},
	{
		id: 3,
		title: "Case Opening Procedures",
		category: "LOP",
		totalSteps: 6,
		pdfUrl: "/sample-pdfs/case-opening.pdf",
	},
];

export const SAMPLE_STEPS: IProcedureStep[] = [
	{
		procedureId: 1,
		stepNumber: 1,
		imageUrl: "/placeholder-step-1.png",
		description: "Access the closed case in e-Defender",
	},
	{
		procedureId: 1,
		stepNumber: 2,
		imageUrl: "/placeholder-step-2.png",
		description: "Update case status by clicking status in header",
	},
	{
		procedureId: 1,
		stepNumber: 3,
		imageUrl: "/placeholder-step-3.png",
		description: "Select 'Post Sentencing' from dropdown",
	},
	{
		procedureId: 1,
		stepNumber: 4,
		imageUrl: "/placeholder-step-4.png",
		description: "After matter concluded, change status back to 'Closed'",
	},
	{
		procedureId: 2,
		stepNumber: 1,
		imageUrl: "/placeholder-step-1.png",
		description: "Open discovery email from court",
	},
	{
		procedureId: 2,
		stepNumber: 2,
		imageUrl: "/placeholder-step-2.png",
		description: "Download all attachments to local drive",
	},
	{
		procedureId: 2,
		stepNumber: 3,
		imageUrl: "/placeholder-step-3.png",
		description: "Save documents to case folder in network drive",
	},
	{
		procedureId: 2,
		stepNumber: 4,
		imageUrl: "/placeholder-step-4.png",
		description: "Update case notes in e-Defender",
	},
	{
		procedureId: 2,
		stepNumber: 5,
		imageUrl: "/placeholder-step-5.png",
		description: "Send notification email to assigned attorney",
	},
	{
		procedureId: 3,
		stepNumber: 1,
		imageUrl: "/placeholder-step-1.png",
		description: "Create new case record in e-Defender",
	},
	{
		procedureId: 3,
		stepNumber: 2,
		imageUrl: "/placeholder-step-2.png",
		description: "Enter client information and contact details",
	},
	{
		procedureId: 3,
		stepNumber: 3,
		imageUrl: "/placeholder-step-3.png",
		description: "Assign case number and case type",
	},
	{
		procedureId: 3,
		stepNumber: 4,
		imageUrl: "/placeholder-step-4.png",
		description: "Set initial court date and location",
	},
	{
		procedureId: 3,
		stepNumber: 5,
		imageUrl: "/placeholder-step-5.png",
		description: "Notify public defender of new assignment",
	},
	{
		procedureId: 3,
		stepNumber: 6,
		imageUrl: "/placeholder-step-6.png",
		description: "Create physical and digital case folders",
	},
];
