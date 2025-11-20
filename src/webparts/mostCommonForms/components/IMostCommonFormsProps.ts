import { WebPartContext } from "@microsoft/sp-webpart-base";

export interface IMostCommonFormsProps {
	description: string;
	isDarkTheme: boolean;
	environmentMessage: string;
	hasTeamsContext: boolean;
	userDisplayName: string;
	instanceId: string;
	context: WebPartContext;
}
