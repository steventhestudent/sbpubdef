import * as React from "react";
import * as ReactDom from "react-dom";
import { BaseClientSideWebPart } from "@microsoft/sp-webpart-base";
import { SPHttpClient } from "@microsoft/sp-http";
import { MSGraphClientV3 } from "@microsoft/sp-http";
import {
  IPropertyPaneConfiguration,
  PropertyPaneTextField,
} from "@microsoft/sp-property-pane";

import UpcomingEvents from "./components/UpcomingEvents";
import { IUpcomingEventsProps, IEventItem, ISharePointEventItem, IGraphEvent, IGraphGroup } from "./components/IUpcomingEventsProps";

export default class UpcomingEventsWebPart extends BaseClientSideWebPart<IUpcomingEventsProps> {

  protected async onInit(): Promise<void> {
    if (!this.properties.visibleToGroups) {
      this.properties.visibleToGroups = "";
    }
  }

  public async render(): Promise<void> {
    const visible = await this._userInAllowedAADGroups();

    if (!visible) {
      console.log("User is not in an allowed Azure AD group. Web part hidden.");
      this.domElement.innerHTML = "";
      return;
    }

    const localEvents = this._loadLocalEvents();
    this._renderReact(localEvents);

    await this._refreshEvents();
  }

  private _renderReact(events: IEventItem[]): void {
    this.domElement.innerHTML = "";
    const container = document.createElement("div");
    this.domElement.appendChild(container);

    const element: React.ReactElement<IUpcomingEventsProps> = React.createElement(
      UpcomingEvents,
      {
        events,
        visibleToGroups: this.properties.visibleToGroups
      }
    );

    ReactDom.render(element, container);
  }

  private _loadLocalEvents(): IEventItem[] {
    try {
      const cached = localStorage.getItem("upcomingEventsCache");
      if (cached) {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (err) {
      console.warn("Failed to load local events:", err);
    }
    return [];
  }

  private async _refreshEvents(): Promise<void> {
    try {
      const events = await this._getEvents();
      localStorage.setItem("upcomingEventsCache", JSON.stringify(events));
      this._renderReact(events);
    } catch (error) {
      console.error("Error refreshing events:", error);
    }
  }

  private async _userInAllowedAADGroups(): Promise<boolean> {
    const rawGroups = this.properties.visibleToGroups ?? "";
    const trimmedGroups = rawGroups.trim();

    if (!trimmedGroups) return true;

    const groupNames: string[] = trimmedGroups
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);

    if (groupNames.length === 0) return true;

    try {
      const client: MSGraphClientV3 = await this.context.msGraphClientFactory.getClient("3");
      const groupsResponse = await client.api(`/me/memberOf?$select=displayName`).get();

      const groups: IGraphGroup[] = Array.isArray(groupsResponse.value)
        ? (groupsResponse.value as IGraphGroup[])
        : [];

      const userGroupNames: string[] = groups
        .filter((g) => typeof g.displayName === "string")
        .map((g) => g.displayName.toLowerCase());

      const isInGroup: boolean = groupNames.some((g: string) =>
        userGroupNames.indexOf(g.toLowerCase()) !== -1
      );

      return isInGroup;
    } catch (error) {
      console.error("Error checking Azure AD groups:", error);
      return false;
    }
  }

  private async _getEvents(): Promise<IEventItem[]> {
    const [sharePointEvents, outlookEvents] = await Promise.all([
      this._getSharePointEvents(),
      this._getOutlookCalendarEvents()
    ]);

    const now = new Date();
    const allEvents = [...sharePointEvents, ...outlookEvents]
      .filter(event => new Date(event.EventDate) >= now)
      .sort((a, b) => new Date(a.EventDate).getTime() - new Date(b.EventDate).getTime());

    return allEvents;
  }

  private async _getSharePointEvents(): Promise<IEventItem[]> {
    const baseUrl = this.context.pageContext.web.absoluteUrl;

    try {
      const listResponse = await this.context.spHttpClient.get(
        `${baseUrl}/_api/web/lists/getbytitle('Events')?$select=Id`,
        SPHttpClient.configurations.v1
      );

      if (!listResponse.ok) return [];

      const listData = await listResponse.json();
      const listGuid = listData.Id;

      const itemsResponse = await this.context.spHttpClient.get(
        `${baseUrl}/_api/web/lists/getbytitle('Events')/items?$select=Id,Title,EventDate,Location&$orderby=EventDate asc`,
        SPHttpClient.configurations.v1
      );

      if (!itemsResponse.ok) return [];

      const itemsData = await itemsResponse.json();
      const items = itemsData.value as ISharePointEventItem[];

      return items.map(item => ({
        Id: item.Id,
        Title: item.Title,
        EventDate: item.EventDate,
        Location: item.Location || "",
        DetailsUrl: `${baseUrl}/_layouts/15/Event.aspx?ListGuid=${listGuid}&ItemId=${item.Id}`,
      }));
    } catch (err) {
      console.error("Failed to fetch SharePoint events:", err);
      return [];
    }
  }

  private async _getOutlookCalendarEvents(): Promise<IEventItem[]> {
    try {
      const client: MSGraphClientV3 = await this.context.msGraphClientFactory.getClient("3");

      const userEventsResponse = await client
        .api("/me/events")
        .select("id,subject,start,end,location,webLink")
        .orderby("start/dateTime ASC")
        .top(10)
        .get();

      const userEvents: IEventItem[] = (userEventsResponse.value as IGraphEvent[] || []).map(event => ({
        Id: event.id,
        Title: event.subject,
        EventDate: event.start?.dateTime || "",
        Location: event.location?.displayName || "",
        DetailsUrl: event.webLink || "",
      }));

      const groupsResponse = await client.api("/me/memberOf?$select=id,displayName").get();
      const groups = Array.isArray(groupsResponse.value) ? groupsResponse.value : [];

      const groupEvents: IEventItem[] = [];
      for (const group of groups) {
        try {
          const groupEventsResponse = await client
            .api(`/groups/${group.id}/events`)
            .select("id,subject,start,end,location,webLink")
            .orderby("start/dateTime ASC")
            .top(10)
            .get();

          const groupItems = (groupEventsResponse.value as IGraphEvent[] || []).map(event => ({
            Id: `${group.id}-${event.id}`,
            Title: `${event.subject}`,
            EventDate: event.start?.dateTime || "",
            Location: event.location?.displayName || "",
            DetailsUrl: event.webLink || "",
          }));

          groupEvents.push(...groupItems);
        } catch (err) {
          console.warn(`Could not fetch events for group ${group.displayName}:`, err);
        }
      }

      return [...userEvents, ...groupEvents];
    } catch (error) {
      console.error("Failed to fetch Outlook calendar events:", error);
      return [];
    }
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: { description: "Settings" },
          groups: [
            {
              groupName: "Visibility",
              groupFields: [
                PropertyPaneTextField("visibleToGroups", {
                  label: "Visible to Azure AD Groups (comma-separated)",
                  description:
                    "Enter one or more Azure AD group names that can see this web part. Leave blank to show to everyone.",
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}