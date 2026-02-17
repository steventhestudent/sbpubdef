// ProcedureChecklistApi.ts
import "@pnp/sp/items";
import "@pnp/sp/lists";
import "@pnp/sp/fields";
import { ListApi } from "@api/ListApi";
import { ListResult, ProcedureChecklistItem } from "@type/ProcedureChecklist";
import { PD } from "@api/config";

type AssignGetOpts = { department?: string };

export class ProcedureChecklistApi extends ListApi<
	ProcedureChecklistItem,
	AssignGetOpts
> {
	protected async getSearch(
		limit = 100,
		opts?: AssignGetOpts,
	): Promise<ProcedureChecklistItem[]> {
		const { department } = opts || {};
		console.log(`searching department '${department}' staff...`);
		this.and("ContentClass:STS_ListItem");
		this.and(`ListTitle:${PD.lists.ProcedureChecklist}`);
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
				"Category",
				"Filename",
				"EffectiveDate",
				"PageCount",
				"json",
				"DocumentURL",
			],
			SortList: [{ Property: "LastModifiedTime", Direction: 1 }],
			TrimDuplicates: false,
		});

		return res.PrimarySearchResults.map(
			(item: ListResult): ProcedureChecklistItem => ({
				id: item.Id,
				title: item.Title || "",
				category: item.Category || "",
				filename: item.Filename || "",
				effectiveDate: item.EffectiveDate || "",
				pageCount: item.PageCount || 0,
				json: item.json || "{}",
				documentURL: item.DocumentURL || "",
			}),
		);
	}

	protected async getRest(
		limitPerSite = 50,
		opts?: AssignGetOpts,
	): Promise<ProcedureChecklistItem[]> {
		const targets = this._sites.length ? this._sites : [""];
		const { department } = opts || {};

		const calls = targets.map(async (siteUrl) => {
			const w = this.pnpWrapper.web(siteUrl);
			const list = w.lists.getByTitle(PD.lists.ProcedureChecklist);

			if (department)
				this.and(
					`${PD.internalSiteColumn.PDDepartment} eq '${department.replace(/'/g, "''")}'`,
				);

			const rows = await list.items
				.select(
					"Id",
					"Title",
					"Category",
					"Filename",
					"EffectiveDate",
					"PageCount",
					"json",
					"DocumentURL",
					// PD.internalSiteColumn.PDDepartment,
				)
				.filter(this.odata)
				.orderBy("Id", false)
				.top(limitPerSite)();

			return rows.map(
				(item: ListResult): ProcedureChecklistItem => ({
					id: item.Id,
					title: item.Title || "",
					category: item.Category || "",
					filename: item.Filename || "",
					effectiveDate: item.EffectiveDate || "",
					pageCount: item.PageCount || 0,
					json: item.json || "{}",
					documentURL: item.DocumentURL || "",
				}),
			);
		});

		const settled = await Promise.allSettled(calls);
		const flat: ProcedureChecklistItem[] = [];
		for (const r of settled)
			if (r.status === "fulfilled") flat.push(...r.value);
		return flat;
	}
}
