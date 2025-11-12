import { BaseApi, StrategyOpts } from "@api/BaseApi";
export abstract class ListApi<
	TRow,
	TGetOpts extends StrategyOpts = StrategyOpts,
	TCreateInput = never,
> extends BaseApi<TRow, TGetOpts, TCreateInput> {
	protected override preprocess(opts?: TGetOpts): void {
		super.preprocess(opts);
		this.withSites(["/sites/PD-Intranet"]);
	}

	/*
		hub search: (across site collections)
	*/
	protected getSearch(limit: number, opts?: TGetOpts): Promise<TRow[]> {
		return Promise.resolve([]);
	}

	/*
		rest: within site collection
	*/
	protected getRest(limit: number, opts?: TGetOpts): Promise<TRow[]> {
		return Promise.resolve([]);
	}
}
