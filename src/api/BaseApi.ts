// BaseApi.ts
import { PNPWrapper } from "@utils/PNPWrapper";

export type KQLAndOr = "AND" | "OR";
export type ODataAndOr = "and" | "or";
export type AndOr = KQLAndOr | ODataAndOr;

export type KQLCondition = string; // PromotedState=2
export type ODataCondition = string; // column eq 'value'
export type QueryCondition = KQLCondition | ODataCondition;

export class QueryPart {
	constructor(
		public type: AndOr,
		public condition: QueryCondition,
	) {}
}

export interface StrategyOpts {
	/* put cross-cutting filters you want everywhere */
}

export abstract class BaseApi<
	TRow,
	TGetOpts extends StrategyOpts = StrategyOpts,
	TCreateInput = never, // type for create inputs (if the API supports create)
> {
	protected parts: QueryPart[] = [];
	protected _sites: string[] = [];

	constructor(public readonly pnpWrapper: PNPWrapper) {}

	withSites(sites: string[]): this {
		this._sites = sites;
		return this;
	}

	protected and(expr: string): void {
		this.parts.push(new QueryPart("and", expr));
	}
	protected or(expr: string): void {
		this.parts.push(new QueryPart("or", expr));
	}
	protected get kql(): string {
		return this.parts.reduce(
			(b, p) =>
				b +
				(b ? (p.type === "and" ? " AND " : " OR ") : "") +
				p.condition,
			"",
		);
	}
	protected get odata(): string {
		return this.parts.reduce(
			(b, p) =>
				b +
				(b ? (p.type === "and" ? " and " : " or ") : "") +
				p.condition,
			"",
		);
	}

	protected preprocess(_opts?: TGetOpts): void {
		this.parts = [];
	}

	async get(limit = 12, opts?: TGetOpts): Promise<TRow[]> {
		this.preprocess(opts);
		const strategy = this.pnpWrapper.chooseStrategy(
			this._sites.length ? this._sites : undefined,
		);
		return strategy === "rest"
			? this.getRest(limit, opts)
			: this.getSearch(limit, opts);
	}

	protected abstract getSearch(
		limit: number,
		opts?: TGetOpts,
	): Promise<TRow[]>;

	protected abstract getRest(limit: number, opts?: TGetOpts): Promise<TRow[]>;

	async create(_input: TCreateInput): Promise<{ url: string }> {
		throw new Error("create() not implemented for this API");
	}
}
