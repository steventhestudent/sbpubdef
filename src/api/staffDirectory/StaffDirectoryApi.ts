// StaffDirectoryApi.ts
import "@pnp/sp/items";
import "@pnp/sp/lists";
import "@pnp/sp/fields";
import { ListApi } from "@api/ListApi";
import { ListResult, PDStaffDirectoryItem } from "@type/PDStaffDirectory";

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
		this.and(`ListTitle:${ENV.LIST_STAFFDIRECTORY}`);
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
				ENV.INTERNALCOLUMN_EXT,
				ENV.INTERNALCOLUMN_WORKCELL,
				ENV.INTERNALCOLUMN_PERSONALCELL,
				"TitleName",
			],
			SortList: [{ Property: "LastModifiedTime", Direction: 1 }],
			TrimDuplicates: false,
		});

		return res.PrimarySearchResults.map(
			(item: ListResult): PDStaffDirectoryItem => ({
				name: item.Title,
				username: item.Username,
				ext: item[ENV.INTERNALCOLUMN_EXT],
				workCell: item[ENV.INTERNALCOLUMN_WORKCELL],
				personalCell: item[ENV.INTERNALCOLUMN_PERSONALCELL],
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
			const list = w.lists.getByTitle(ENV.LIST_STAFFDIRECTORY);

			if (department)
				this.and(
					`${ENV.INTERNALCOLUMN_PDDEPARTMENT} eq '${department.replace(/'/g, "''")}'`,
				);

			const rows = await list.items
				.select(
					"Id",
					"Title",
					"Username",
					ENV.INTERNALCOLUMN_EXT,
					ENV.INTERNALCOLUMN_WORKCELL,
					ENV.INTERNALCOLUMN_PERSONALCELL,
					"TitleName",
					// ENV.INTERNALCOLUMN_PDDEPARTMENT,
				)
				.filter(this.odata)
				.orderBy("Id", false)
				.top(limitPerSite)();

			return rows.map(
				(item: ListResult): PDStaffDirectoryItem => ({
					name: item.Title,
					username: item.Username,
					ext: item[ENV.INTERNALCOLUMN_EXT],
					workCell: item[ENV.INTERNALCOLUMN_WORKCELL],
					personalCell: item[ENV.INTERNALCOLUMN_PERSONALCELL],
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
