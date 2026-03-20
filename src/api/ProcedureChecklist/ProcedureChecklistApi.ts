// ProcedureChecklistApi.ts
import "@pnp/sp/items";
import "@pnp/sp/lists";
import "@pnp/sp/fields";
import { ListApi } from "@api/ListApi";
import { ListResult, ProcedureChecklistItem } from "@type/ProcedureChecklist";

type AssignGetOpts = { department?: string };

export class ProcedureChecklistApi extends ListApi<
	ProcedureChecklistItem,
	AssignGetOpts
> {
	listName = ENV.LIST_PROCEDURECHECKLIST;
	protected async getRest(
		limitPerSite = 50,
		opts?: AssignGetOpts,
	): Promise<ProcedureChecklistItem[]> {
		const rows = await this.list()
			.items.select(
				"Id",
				"Title",
				"Purpose",
				"Category",
				"Filename",
				"EffectiveDate",
				"PageCount",
				"json",
				"DocumentURL",
			)
			.filter(this.odata)
			.orderBy("Id", false)
			.top(limitPerSite)();
		console.log("procedures", rows);
		return rows.map(
			(item: ListResult): ProcedureChecklistItem => ({
				id: item.Id,
				title: item.Title || "",
				purpose: item.Purpose || "",
				category: item.Category || "",
				filename: item.Filename || "",
				effectiveDate: item.EffectiveDate || "",
				pageCount: item.PageCount || 0,
				json: item.json || "{}",
				documentURL: item.DocumentURL || "",
			}),
		);
	}
}
