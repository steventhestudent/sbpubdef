import { WebPartContext } from "@microsoft/sp-webpart-base";

export interface IExpertWitnessDirectoryProps {
  description: string;
  isDarkTheme: boolean;
  environmentMessage: string;
  hasTeamsContext: boolean;
  userDisplayName: string;

  /** SPFx context calling the expert directory list */
  context: WebPartContext;

  /** collapsible */
  instanceId: string;
}
