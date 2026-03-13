import * as React from "react";
import * as ReactDom from "react-dom";
import {
  BaseClientSideWebPart,
  IPropertyPaneConfiguration,
} from "@microsoft/sp-webpart-base";
import { PropertyPaneDropdown, PropertyPaneSlider } from "@microsoft/sp-property-pane";

import {
  PropertyFieldCollectionData,
  CustomCollectionFieldType,
} from "@pnp/spfx-property-controls/lib/PropertyFieldCollectionData";

import UrgencyPortal from "./components/UrgencyPortal";
import {
  IUrgencyPortalProps,
  IPowerBiLinkConfig,
  CarouselMode,
} from "./components/IUrgencyPortalProps";

export interface IUrgencyPortalWebPartProps {
  links: IPowerBiLinkConfig[];
  defaultUrl?: string;
  carouselMode?: CarouselMode;
  visibleCount?: number;
}

function normalizeBookmarkName(bookmarkName?: string): string {
  return (bookmarkName || "").trim().toLowerCase();
}

function normalizePageName(pageName?: string): string {
  return (pageName || "").trim();
}

function buildLinkKey(link: IPowerBiLinkConfig): string {
  const url: string = (link.url || "").trim();
  const page: string = normalizePageName(link.pageName);
  const bookmark: string = normalizeBookmarkName(link.bookmarkName);

  const parts: string[] = [url];
  if (page) parts.push(`page:${page}`);
  if (bookmark) parts.push(`bookmark:${bookmark}`);

  return parts.join("||");
}

export default class UrgencyPortalWebPart extends BaseClientSideWebPart<IUrgencyPortalWebPartProps> {
  public render(): void {
    const element: React.ReactElement<IUrgencyPortalProps> =
      React.createElement(UrgencyPortal, {
        context: this.context,
        links: this.properties.links || [],
        defaultUrl: this.properties.defaultUrl || "",
        carouselMode: this.properties.carouselMode || "auto",
        visibleCount: this.properties.visibleCount ?? 3,
      });

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    const linkOptions = (this.properties.links || []).map(
      (l: IPowerBiLinkConfig): { key: string; text: string } => {
        const key: string = buildLinkKey(l);
        const text: string = (l.title || "").trim() || (l.url || "").trim();
        return { key, text };
      },
    );

    const options: Array<{ key: string; text: string }> = [
      { key: "", text: "-- Select --" },
      ...linkOptions.filter(
        (o: { key: string; text: string }): boolean => Boolean(o.key),
      ),
    ];

    return {
      pages: [
        {
          header: { description: "Power BI links" },
          groups: [
            {
              groupName: "Startup",
              groupFields: [
                PropertyPaneDropdown("defaultUrl", {
                  label: "Default Link",
                  options,
                }),
                PropertyPaneDropdown("carouselMode", {
                  label: "Carousel Layout",
                  options: [
                    { key: "auto", text: "Auto" },
                    { key: "horizontal", text: "Horizontal" },
                    { key: "vertical", text: "Vertical" },
                  ],
                }),
                PropertyPaneSlider("visibleCount", {
                  label: "Cards Shown",
                  min: 1,
                  max: 3,
                  step: 1,
                  value: this.properties.visibleCount ?? 3,
                }),
              ],
            },
            {
              groupName: "Links",
              groupFields: [
                PropertyFieldCollectionData("links", {
                  key: "links",
                  label: "",
                  panelHeader: "Manage links",
                  manageBtnLabel: "Edit links",
                  value: this.properties.links,
                  fields: [
                    {
                      id: "title",
                      title: "Title",
                      type: CustomCollectionFieldType.string,
                      required: true,
                    },
                    {
                      id: "kind",
                      title: "Type",
                      type: CustomCollectionFieldType.dropdown,
                      required: true,
                      options: [
                        { key: "report", text: "Report" },
                        { key: "visual", text: "Visual" },
                      ],
                    },
                    {
                      id: "url",
                      title: "Power BI URL",
                      type: CustomCollectionFieldType.string,
                      required: true,
                    },
                    {
                      id: "pageName",
                      title: "Page ID (optional)",
                      type: CustomCollectionFieldType.string,
                      required: false,
                    },
                    {
                      id: "bookmarkName",
                      title: "Bookmark Name (optional)",
                      type: CustomCollectionFieldType.string,
                      required: false,
                    },
                    {
                      id: "thumbnailUrl",
                      title: "Thumbnail URL (optional)",
                      type: CustomCollectionFieldType.string,
                      required: false,
                    },
                  ],
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}