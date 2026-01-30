import type { SPHttpClient } from "@microsoft/sp-http";

export interface ILopsDirectoryProps {
  /** Needed by Collapsible */
  instanceId: string;

  /** Site URL to call REST on (PD-Intranet) */
  siteUrl: string;

  /** SPFx client for REST calls */
  spHttpClient: SPHttpClient;
}
