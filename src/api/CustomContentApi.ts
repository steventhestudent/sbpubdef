import { PNPWrapper } from "@utils/PNPWrapper";
import { Announcement, GetOpts, SearchOpts } from "@type/PDAnnouncement";

export class QueryPart {
	constructor(
		public readonly conditionType: string,
		public readonly condition: string,
	) {}
}

export class CustomContentApi {
	parts: QueryPart[];
	contentType?: string;
	department?: string;
	departmentMp?: string;

	constructor(public pnpWrapper: PNPWrapper) {}

	/*
		query api
	 */
	and(queryPartContent: string): void {
		this.parts.push(new QueryPart("and", queryPartContent));
	}

	or(queryPartContent: string): void {
		this.parts.push(new QueryPart("or", queryPartContent));
	}

	get kql(): string {
		let buffer = "";
		this.parts.forEach((part) => {
			const prefix = part.conditionType === "and" ? " AND " : " OR ";
			buffer += (buffer ? prefix : "") + part.condition;
		});
		return buffer;
	}

	/*
		get
	 */
	async get(limit = 12, opts?: GetOpts): Promise<Announcement[] | undefined> {
		const { targetSites, department } = opts || {};
		return this.pnpWrapper.chooseStrategy() === "rest"
			? this.getRest(limit, targetSites, department)
			: this.getSearch(limit, opts);
	}

	protected preprocess(opts?: SearchOpts): void {
		this.parts = new Array<QueryPart>();
		this.contentType = opts?.contentType;
		this.department = opts?.department;
		this.departmentMp = opts?.departmentMp;
	}

	/*
		hub search
	*/
	async getSearch(
		limit = 12,
		opts?: SearchOpts,
	): Promise<Announcement[] | undefined> {
		this.preprocess(opts);
		if (this.contentType) this.and(`ContentType:"${this.contentType}"`);
		if (this.pnpWrapper.hubSiteId)
			this.and(`DepartmentId:${this.pnpWrapper.hubSiteId}`);
		else if (this.pnpWrapper.siteUrls.length)
			this.and(
				`(${this.pnpWrapper.siteUrls.map((p) => `Path:${p}*`).join(" OR ")})`,
			);
		// Department filter in KQL only if you’ve mapped a managed property
		if (this.department && this.departmentMp)
			this.and(`${this.departmentMp}="${this.department}"`);
		return undefined;
	}

	/*
		rest
	*/
	async getRest(
		limitPerSite = 8,
		sites?: string[],
		department?: string,
	): Promise<Announcement[] | undefined> {
		this.preprocess({ department });
		return undefined;
	}
}
