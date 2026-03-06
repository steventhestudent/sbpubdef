// ProcedureStepsApi.ts
import "@pnp/sp/items";
import "@pnp/sp/lists";
import "@pnp/sp/fields";
import { ListApi } from "@api/ListApi";
import {
	ProcedureStepItem,
	ProcedureStepsListResult,
} from "@type/ProcedureSteps";

type StepsGetOpts = {
	procedureChecklistId?: number;
	procedureFilename?: string;
};

export class ProcedureStepsApi extends ListApi<
	ProcedureStepItem,
	StepsGetOpts
> {
	protected async getRest(
		limitPerSite = 50,
		opts?: StepsGetOpts,
	): Promise<ProcedureStepItem[]> {
		const w = this.pnpWrapper.web(this.pnpWrapper.siteUrls[0]);
		const list = w.lists.getByTitle(ENV.LIST_PROCEDURESTEPS);

		if (opts) this.and(`ProcedureId/Id eq ${opts.procedureChecklistId}`);

		const rows = await list.items
			.select(
				"Id",
				"Title",
				"ProcedureId/Id",
				"Step",
				"Text",
				ENV.INTERNALCOLUMN_IMAGE,
			)
			.filter(this.odata)
			.orderBy("Step", true) // ascending
			.top(limitPerSite)
			.expand("ProcedureId")();

		return (
			(rows as unknown as ProcedureStepsListResult[])
				.map(
					(i): ProcedureStepItem => ({
						id: i.Id,
						procedureId:
							typeof i.ProcedureIDId === "number"
								? i.ProcedureIDId
								: undefined,
						step:
							typeof i.Step === "number"
								? i.Step
								: Number(i.Step || 0),
						text:
							typeof i.Text === "string"
								? i.Text
								: i.Text
									? String(i.Text)
									: "",
						images:
							typeof i.Images === "string"
								? i.Images
								: i.Images
									? String(i.Images)
									: "",
					}),
				)
				// optional: drop empty or step < 1
				.filter((s) => s.step >= 1)
				// optional: ensure strict sorting even if SharePoint returns weird
				.sort((a, b) => a.step - b.step)
		);
	}
}
