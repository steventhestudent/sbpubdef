// StaffDirectoryApi.ts
import "@pnp/sp/items";
import "@pnp/sp/lists";
import "@pnp/sp/fields";
import { ListApi } from "@api/ListApi";
import { ListResult, PDStaffDirectoryItem } from "@type/PDStaffDirectory";
import { PD } from "@api/config";

type AssignGetOpts = { department?: string };

export class StaffDirectoryApi extends ListApi<
	PDStaffDirectoryItem,
	AssignGetOpts
> {
	protected async getSearch(
		limit = 100,
		opts?: AssignGetOpts,
	): Promise<PDStaffDirectoryItem[]> {
		const { department } = opts || {};
		console.log(`searching department '${department}' staff...`);
		this.and("ContentClass:STS_ListItem");
		this.and(`ListTitle:${PD.lists.StaffDirectory}`);
		if (this.pnpWrapper.hubSiteId)
			this.and(`DepartmentId:${this.pnpWrapper.hubSiteId}`);
		else if (this._sites.length)
			this.and(
				"(" + this._sites.map((p) => `Path:${p}*`).join(" OR ") + ")",
			);
		// if (department && this.pnpWrapper.departmentMp)
		// parts.push(`${this.pnpWrapper.departmentMp}="${department}"`);

		const res = await this.pnpWrapper.sp.search({
			Querytext: this.kql,
			RowLimit: limit,
			SelectProperties: [
				"Id",
				"Title",
				"Username",
				"EXT_x002e_",
				"WorkCell_x0023_",
				"PersonalCell_x0023_",
				"TitleName",
			],
			SortList: [{ Property: "LastModifiedTime", Direction: 1 }],
			TrimDuplicates: false,
		});

		return res.PrimarySearchResults.map(
			(item: ListResult): PDStaffDirectoryItem => ({
				name: item.Title,
				username: item.Username,
				ext: item.EXT_x002e_,
				workCell: item.WorkCell_x0023_,
				personalCell: item.PersonalCell_x0023_,
				titleName: item.TitleName,
			}),
		);
	}

	protected async getRest(
		limitPerSite = 50,
		opts?: AssignGetOpts,
	): Promise<PDStaffDirectoryItem[]> {
		const targets = this._sites.length ? this._sites : [""];
		const { department } = opts || {};

		const calls = targets.map(async (siteUrl) => {
			const w = this.pnpWrapper.web(siteUrl);
			const list = w.lists.getByTitle(PD.lists.StaffDirectory);

			if (department)
				this.and(
					`${PD.internalSiteColumn.PDDepartment} eq '${department.replace(/'/g, "''")}'`,
				);

			const rows = await list.items
				.select(
					"Id",
					"Title",
					"Username",
					"EXT_x002e_",
					"WorkCell_x0023_",
					"PersonalCell_x0023_",
					"TitleName",
					// PD.internalSiteColumn.PDDepartment,
				)
				.filter(this.odata)
				.orderBy("Id", false)
				.top(limitPerSite)();

			return rows.map(
				(item: ListResult): PDStaffDirectoryItem => ({
					name: item.Title,
					username: item.Username,
					ext: item.EXT_x002e_,
					workCell: item.WorkCell_x0023_,
					personalCell: item.PersonalCell_x0023_,
					titleName: item.TitleName,
				}),
			);
		});

		const settled = await Promise.allSettled(calls);
		const flat: PDStaffDirectoryItem[] = [];
		for (const r of settled)
			if (r.status === "fulfilled") flat.push(...r.value);
		return flat;
	}
}
