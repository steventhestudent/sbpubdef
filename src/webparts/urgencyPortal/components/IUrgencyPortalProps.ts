import { WebPartContext } from "@microsoft/sp-webpart-base";

export type EmbedKind = "report" | "visual";

export interface IPowerBiLinkConfig {
	title: string;
	kind: EmbedKind;
	url: string;
}

export interface IPowerBiParsedLink {
	title: string;
	kind: EmbedKind;
	reportId: string;
	pageName?: string;
	visualName?: string;
}

export interface IUrgencyPortalProps {
	context: WebPartContext;
	links: IPowerBiLinkConfig[];
}
