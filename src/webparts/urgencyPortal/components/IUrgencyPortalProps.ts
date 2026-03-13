import { WebPartContext } from "@microsoft/sp-webpart-base";

export type EmbedKind = "report" | "visual";

export interface IPowerBiLinkConfig {
  title: string;
  kind: EmbedKind;
  url: string;
  pageName?: string;
  bookmarkName?: string;
  thumbnailUrl?: string;
}

export interface IPowerBiParsedLink {
  title: string;
  kind: EmbedKind;
  reportId: string;
  pageName?: string;
  visualName?: string;
  bookmarkName?: string;
}

export type CarouselMode = "auto" | "horizontal" | "vertical";

export interface IUrgencyPortalProps {
  context: WebPartContext;
  links: IPowerBiLinkConfig[];
  defaultUrl?: string;
  carouselMode?: CarouselMode;
  visibleCount?: number;
}