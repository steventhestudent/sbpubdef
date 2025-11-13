// AssignmentsApi.ts
import "@pnp/sp/items";
import "@pnp/sp/lists";
import "@pnp/sp/fields";
import { ListApi } from "@api/ListApi";
import { ListResult, PDAssignment } from "@type/PDAssignment";
import { PD } from "@api/config";

type AssignGetOpts = { department?: string };

export class AssignmentsApi extends ListApi<PDAssignment, AssignGetOpts> {
	protected async getSearch(
		limit = 100,
		opts?: AssignGetOpts,
	): Promise<PDAssignment[]> {
		const { department } = opts || {};
		console.log(`searching department '${department}' assignments...`);
		this.and("ContentClass:STS_ListItem");
		this.and(`ListTitle:${PD.lists.PDAssignment}`);
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
				"Title",
				"Path",
				"ListItemId",
				"SPWebUrl",
				"PDDepartment",
			],
			SortList: [{ Property: "LastModifiedTime", Direction: 1 }],
			TrimDuplicates: false,
		});

		return res.PrimarySearchResults.map(
			(r: ListResult): PDAssignment => ({
				id: Number(r.Id),
				title: r.Title ?? "(untitled)",
				url: r.Path,
				siteUrl: r.SPWebUrl,
				PDDepartment:
					r.PD_x0020_Department || r.PDDepartment || "Everyone",
			}),
		);
	}

	protected async getRest(
		limitPerSite = 50,
		opts?: AssignGetOpts,
	): Promise<PDAssignment[]> {
		const targets = this._sites.length ? this._sites : [""];
		const { department } = opts || {};

		const calls = targets.map(async (siteUrl) => {
			const w = this.pnpWrapper.web(siteUrl);
			const list = w.lists.getByTitle(PD.lists.PDAssignment);

			if (department)
				this.and(
					`${PD.internalSiteColumn.PDDepartment} eq '${department.replace(/'/g, "''")}'`,
				);

			const rows = await list.items
				.select(
					"Id",
					"Title",
					"FileRef",
					PD.internalSiteColumn.PDDepartment,
				)
				.filter(this.odata)
				.orderBy("Id", false)
				.top(limitPerSite)();

			return rows.map(
				(i: ListResult): PDAssignment => ({
					id: i.Id,
					title: i.Title ?? "(untitled)",
					url: i.FileRef,
					PDDepartment:
						i.PD_x0020_Department || i.PDDepartment || "Everyone",
					siteUrl: siteUrl || window.location.pathname,
				}),
			);
		});

		const settled = await Promise.allSettled(calls);
		const flat: PDAssignment[] = [];
		for (const r of settled)
			if (r.status === "fulfilled") flat.push(...r.value);
		return flat;
	}
}
