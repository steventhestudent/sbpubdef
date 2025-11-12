// CustomContentApi.ts
import { BaseApi, StrategyOpts } from "@api/BaseApi";

export type AnnGetOpts = StrategyOpts & {
	contentType?: string; // e.g., "PD Announcement"
	department?: string; // choice value (Attorney/HR/…)
	departmentMp?: string; // managed property alias for Search (e.g., "Dept")
};

export abstract class CustomContentApi<
	TRow,
	TCreateInput = never,
> extends BaseApi<TRow, AnnGetOpts, TCreateInput> {
	protected contentType?: string;
	protected department?: string;
	protected departmentMp?: string;

	protected override preprocess(opts?: AnnGetOpts): void {
		super.preprocess(opts);
		this.contentType = opts?.contentType;
		this.department = opts?.department;
		this.departmentMp = opts?.departmentMp;
	}

	/** Build common KQL scope for news/pages */
	protected buildSearchScopeParts(): string[] {
		const parts: string[] = [];
		if (this.contentType) parts.push(`ContentType:"${this.contentType}"`);

		// hub scope or explicit paths
		if (this.pnpWrapper.hubSiteId) {
			parts.push(`DepartmentId:${this.pnpWrapper.hubSiteId}`);
		} else if (this._sites.length) {
			parts.push(
				"(" + this._sites.map((p) => `Path:${p}*`).join(" OR ") + ")",
			);
		}

		// // Department filter only if MP is known
		// if (this.department && (this.departmentMp || this.pnpWrapper.departmentMp)) {
		// 	const mp = this.departmentMp || this.pnpWrapper.departmentMp!;
		// 	parts.push(`${mp}="${this.department}"`);
		// }
		return parts;
	}

	// 	/*
	// 		hub search: (across site collections)
	// */
	// 	async getSearch(
	// 		limit = 12,
	// 		opts?: SearchOpts,
	// 	): Promise<Announcement[] | undefined> {
	// 		this.preprocess(opts);
	// 		if (this.contentType) this.and(`ContentType:"${this.contentType}"`);
	// 		if (this.pnpWrapper.hubSiteId)
	// 			this.and(`DepartmentId:${this.pnpWrapper.hubSiteId}`);
	// 		else if (this.pnpWrapper.siteUrls.length)
	// 			this.and(
	// 				`(${this.pnpWrapper.siteUrls.map((p) => `Path:${p}*`).join(" OR ")})`,
	// 			);
	// 		// Department filter in KQL only if you’ve mapped a managed property
	// 		if (this.department && this.departmentMp)
	// 			this.and(`${this.departmentMp}="${this.department}"`);
	// 		return undefined;
	// 	}
	//
	// 	/*
	// 		rest: within site collection
	// 	*/
	// 	async getRest(
	// 		limitPerSite = 8,
	// 		sites?: string[],
	// 		department?: string,
	// 	): Promise<Announcement[] | undefined> {
	// 		this.preprocess({ department });
	// 		if (department)
	// 			this.and(
	// 				`${PD.siteColumn.PDDepartment} eq '${department.replace(/'/g, "''")}'`,
	// 			);
	// 		return undefined;
	// 	}
}
