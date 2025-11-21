import "@dist/tailwind.css";
import * as React from "react";
import * as ReactDom from "react-dom";
import { Version } from "@microsoft/sp-core-library";
import {
	type IPropertyPaneConfiguration,
	PropertyPaneTextField,
} from "@microsoft/sp-property-pane";
import { BaseClientSideWebPart } from "@microsoft/sp-webpart-base";
import { IReadonlyTheme } from "@microsoft/sp-component-base";

import * as strings from "UpcomingEventsWebPartStrings";
import { UpcomingEvents } from "./components/UpcomingEvents";
import { IUpcomingEventsProps } from "./components/IUpcomingEventsProps";
import { GraphClient } from "@utils/graph/GraphClient";
import type { MSGraphClientV3 } from "@microsoft/sp-http";

export interface IUpcomingEventsWebPartProps {
	description: string;
	visibleToGroups?: string;
}

export default class UpcomingEventsWebPart extends BaseClientSideWebPart<IUpcomingEventsWebPartProps> {
  private _isDarkTheme: boolean = false;
  private _environmentMessage: string = "";

  public async render(): Promise<void> {
	const isVisible = await this._userInAllowedAADGroups();

	this.domElement.style.display = isVisible ? "" : "none";

	const element: React.ReactElement<IUpcomingEventsProps> =
		React.createElement(UpcomingEvents, {
		description: this.properties.description,
		isDarkTheme: this._isDarkTheme,
		environmentMessage: this._environmentMessage,
		hasTeamsContext: !!this.context.sdks.microsoftTeams,
		userDisplayName: this.context.pageContext.user.displayName,
		context: this.context,
		});

	ReactDom.render(element, this.domElement);
	}

  private async _userInAllowedAADGroups(): Promise<boolean> {
	const raw = (this.properties.visibleToGroups ?? "").trim();

	if (!raw) return true;

	const groupNames = raw
		.split(",")
		.map((g) => g.trim().toLowerCase())
		.filter(Boolean);

	if (groupNames.length === 0) return true;

	try {
		const client: MSGraphClientV3 = await GraphClient(this.context);
		const res = await client.api("/me/memberOf?$select=displayName").get();

		const userGroupNames: string[] = (res.value || [])
		.map((g: { displayName?: string }) => (g.displayName ?? "").toLowerCase())
		.filter(Boolean);

		return groupNames.some((g) => userGroupNames.includes(g));
	} catch (error) {
		console.warn("Group membership check failed; showing web part:", error);
		return true;
	}
	}

  protected onInit(): Promise<void> {
    return this._getEnvironmentMessage().then((message) => {
      this._environmentMessage = message;
    });
  }

  private _getEnvironmentMessage(): Promise<string> {
    if (!!this.context.sdks.microsoftTeams) {
      // running in Teams, office.com or Outlook
      return this.context.sdks.microsoftTeams.teamsJs.app
        .getContext()
        .then((context) => {
          let environmentMessage: string = "";
          switch (context.app.host.name) {
            case "Office":
              environmentMessage = this.context.isServedFromLocalhost
                ? strings.AppLocalEnvironmentOffice
                : strings.AppOfficeEnvironment;
              break;
            case "Outlook":
              environmentMessage = this.context.isServedFromLocalhost
                ? strings.AppLocalEnvironmentOutlook
                : strings.AppOutlookEnvironment;
              break;
            case "Teams":
            case "TeamsModern":
              environmentMessage = this.context.isServedFromLocalhost
                ? strings.AppLocalEnvironmentTeams
                : strings.AppTeamsTabEnvironment;
              break;
            default:
              environmentMessage = strings.UnknownEnvironment;
          }
          return environmentMessage;
        });
    }

    return Promise.resolve(
      this.context.isServedFromLocalhost
        ? strings.AppLocalEnvironmentSharePoint
        : strings.AppSharePointEnvironment,
    );
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) {
      return;
    }

    this._isDarkTheme = !!currentTheme.isInverted;
    const { semanticColors } = currentTheme;

    if (semanticColors) {
      this.domElement.style.setProperty(
        "--bodyText",
        semanticColors.bodyText || null,
      );
      this.domElement.style.setProperty(
        "--link",
        semanticColors.link || null,
      );
      this.domElement.style.setProperty(
        "--linkHovered",
        semanticColors.linkHovered || null,
      );
    }
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse("1.0");
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription,
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField("description", {
                  label: strings.DescriptionFieldLabel,
                }),
                PropertyPaneTextField("visibleToGroups", {
                  label: "Visible to Azure AD Groups (comma-separated)",
                  description:
                    "Enter Azure AD group names that can see this web part. Leave blank to show to everyone.",
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}
