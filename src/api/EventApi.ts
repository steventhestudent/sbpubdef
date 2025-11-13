import { ListApi } from "@api/ListApi";
import { PD } from "@api/config";

export type EventGetOpts = {
	department?: string;
	fromUtc?: string; // ISO lower bound for EventDate (default: now)
	toUtc?: string; // optional upper bound
	listTitle?: string; // default "Events"
};

export abstract class EventApi<
	TRow,
	TGetOpts extends EventGetOpts = EventGetOpts,
> extends ListApi<TRow, TGetOpts> {
	protected listTitle(opts?: TGetOpts): string {
		return opts?.listTitle || "Events";
	}

	/** Build OData date filters */
	protected addDateFilters(opts?: TGetOpts): void {
		const from = opts?.fromUtc ?? new Date().toISOString(); // upcoming by default
		this.and(`EventDate ge datetime'${from}'`);
		if (opts?.toUtc) this.and(`EventDate le datetime'${opts.toUtc}'`);
	}

	/** Resolve PDDepartment OData prop name on THIS list */
	protected async resolveDeptProp(list: any): Promise<string | undefined> {
		try {
			const fld = await list.fields
				.getByInternalNameOrTitle("PDDepartment")
				.select("InternalName", "EntityPropertyName")();
			return fld.EntityPropertyName || fld.InternalName;
		} catch {
			return undefined;
		}
	}

	/** Resolve PD Events CT id on THIS list (if attached) */
	protected async resolvePdEventsCtId(
		list: any,
	): Promise<string | undefined> {
		try {
			const cts = await list.contentTypes.select("StringId", "Name")();
			const hit = (cts as Array<{ StringId: string; Name: string }>).find(
				(ct) => ct.Name === PD.contentType.Event,
			); // "PD Events"
			return hit?.StringId;
		} catch {
			return undefined;
		}
	}
}
