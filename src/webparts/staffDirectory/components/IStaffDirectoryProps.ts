import { WebPartContext } from "@microsoft/sp-webpart-base";

export interface IStaffDirectoryProps {
	description: string;
	fetchOnMount: boolean;
	isDarkTheme: boolean;
	environmentMessage: string;
	hasTeamsContext: boolean;
	userDisplayName: string;
	context: WebPartContext;
}
