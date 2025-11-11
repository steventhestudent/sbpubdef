import "@dist/tailwind.css";
import * as React from "react";
import * as ReactDom from "react-dom";
import { Version } from "@microsoft/sp-core-library";
import {
	type IPropertyPaneConfiguration,
	PropertyPaneTextField,
} from "@microsoft/sp-property-pane";
import { BaseClientSideWebPart } from "@microsoft/sp-webpart-base";
import { SPHttpClient, SPHttpClientResponse } from "@microsoft/sp-http";

import AttorneyAssignments from "./components/AttorneyAssignments";
import {
	IAssignment,
	IAttorneyAssignmentsWebPartProps,
	ISharePointListResponse,
} from "./components/IAttorneyAssignmentsProps";

import * as Utils from "@utils";

export default class AttorneyAssignmentsWebPart extends BaseClientSideWebPart<IAttorneyAssignmentsWebPartProps> {
	public async render(): Promise<void> {
		const visible = await this._userInAllowedAADGroups();

		if (!visible) {
			console.log(
				"User is not in an allowed Azure AD group. Web part hidden.",
			);
			this.domElement.innerHTML = "";
			return;
		}

		const assignments = await this._loadAssignments();

		this.domElement.innerHTML = "";
		const container = document.createElement("div");
		this.domElement.appendChild(container);

		const element = React.createElement(AttorneyAssignments, {
			assignments,
			context: this.context,
		});

		ReactDom.render(element, container);
	}

	private async _userInAllowedAADGroups(): Promise<boolean> {
		const rawGroups = this.properties.visibleToGroups;
		if (!rawGroups || (Array.isArray(rawGroups) && rawGroups.length === 0))
			return true;
		const groupNames: string[] = Array.isArray(rawGroups)
			? rawGroups
			: rawGroups
					.split(",")
					.map((g) => g.trim())
					.filter(Boolean);

		if (groupNames.length === 0) return true;
		const groups = await Utils.userGroupNames(this.context);
		return groupNames.some(
			(g: string) => groups.indexOf(g.toLowerCase()) !== -1,
		);
	}

	private async _loadAssignments(): Promise<IAssignment[]> {
		if (!this.properties.listName) {
			console.warn("No SharePoint list name configured");
			return [];
		}

		try {
			const webUrl = this.context.pageContext.web.absoluteUrl;
			const userEmail =
				this.context.pageContext.user.email?.toLowerCase();

			const listUrl = `${webUrl}/_api/web/lists/getbytitle('${this.properties.listName}')/items?$select=Id,Title,Client,Court,NextHearing,Status,Link,AssignedAttorney_x002f_Team/Id,AssignedAttorney_x002f_Team/Title,AssignedAttorney_x002f_Team/EMail&$expand=AssignedAttorney_x002f_Team`;

			const response: SPHttpClientResponse =
				await this.context.spHttpClient.get(
					listUrl,
					SPHttpClient.configurations.v1,
				);

			if (!response.ok) {
				console.error(`Failed to fetch list: ${response.statusText}`);
				return [];
			}

			const data: ISharePointListResponse = await response.json();

			return data.value.map((item) => {
				const assigned = item.AssignedAttorney_x002f_Team;
				const assignedPerson = Array.isArray(assigned)
					? assigned[0]
					: assigned;

				const attorneyEmail = assignedPerson?.EMail || "";
				const isMyCase = userEmail
					? attorneyEmail.toLowerCase() === userEmail
					: false;

				return {
					id: item.Id,
					caseNumber: item.Title,
					client: item.Client,
					court: item.Court,
					nextHearing: item.NextHearing,
					status: item.Status,
					link:
						typeof item.Link === "object" && item.Link?.Url
							? item.Link.Url
							: typeof item.Link === "string"
								? item.Link
								: undefined,
					attorneyEmail,
					attorneyName: assignedPerson?.Title || "",
					isMyCase,
				};
			});
		} catch (error) {
			console.error("Error loading assignments:", error);
			return [];
		}
	}

	/*
		default webpart
	*/
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
					header: { description: "Settings" },
					groups: [
						{
							groupName: "Visibility",
							groupFields: [
								PropertyPaneTextField("visibleToGroups", {
									label: "Visible to Azure AD Groups (comma-separated)",
									description:
										"Enter one or more Azure AD group names that can see this web part.",
								}),
							],
						},
						{
							groupName: "List Configuration",
							groupFields: [
								PropertyPaneTextField("listName", {
									label: "SharePoint List Name",
									description:
										"Enter the exact name of your SharePoint list (e.g., AttorneyAssignments)",
								}),
							],
						},
					],
				},
			],
		};
	}
}
