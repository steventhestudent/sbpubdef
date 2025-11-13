import "@pnp/sp/items";
import "@pnp/sp/lists";
import "@pnp/sp/fields";
import "@pnp/sp/content-types";

import { EventApi, EventGetOpts } from "@api/EventApi";
import { PDEvent } from "@type/PDEvent";
import { PD } from "@api/config";

export class EventsApi extends EventApi<PDEvent, EventGetOpts> {
	/** Prefer REST for Events (dates are reliable here). */
	protected async getRest(
		limitPerSite = 50,
		opts?: EventGetOpts,
	): Promise<PDEvent[]> {
		this.preprocess(opts);

		const targets = this._sites.length ? this._sites : [""]; // "" = current site
		const { department } = opts || {};

		const calls = targets.map(async (siteUrl) => {
			const w = this.pnpWrapper.web(siteUrl);
			const list = w.lists.getByTitle(this.listTitle(opts));
			const { Id: listGuid } = await list.select("Id")(); // List GUID for Details URL
			const deptProp = await this.resolveDeptProp(list);
			// this.and(`startswith(ContentTypeId,'${PD.contentType.Event}')`);
			this.addDateFilters(opts);
			if (department && deptProp)
				this.and(`${deptProp} eq '${department.replace(/'/g, "''")}'`);
			const rows = await list.items
				.select(
					"Id",
					"Title",
					"EventDate",
					"EndDate",
					"Location",
					PD.internalSiteColumn.PDDepartment,
				)
				.filter(this.odata)
				.orderBy("EventDate", true) // ascending
				.top(limitPerSite)();
			const base = w.toUrl(); // absolute or server-relative depending on pnp setup
			const siteOrigin = new URL(base, window.location.origin).origin;
			return (rows as Array<Record<string, any>>).map(
				(i): PDEvent => ({
					id: i.Id,
					title: i.Title ?? "(untitled)",
					date: i.EventDate, // ISO from list
					endDate: i.EndDate,
					location: i.Location,
					detailsUrl: `${siteOrigin}/_layouts/15/Event.aspx?ListGuid=${listGuid}&ItemId=${i.Id}`,
					siteUrl: siteUrl || window.location.pathname,
					PDDepartment: deptProp ? i[deptProp] : undefined,
				}),
			);
		});
		const settled = await Promise.allSettled(calls);
		const flat: PDEvent[] = [];
		for (const r of settled)
			if (r.status === "fulfilled") flat.push(...r.value);
		// Sort globally by EventDate ascending
		return flat.sort(
			(a, b) =>
				new Date(a.date || 0).getTime() -
				new Date(b.date || 0).getTime(),
		);
	}

	/**
	 * Search is often brittle for Events (date fields aren’t consistently mapped).
	 * You can either:
	 *  - (A) just delegate to REST across sites (recommended), or
	 *  - (B) implement KQL + then hydrate with REST per item (heavier).
	 *
	 * We’ll do (A) for reliability.
	 */
	protected async getSearch(
		limit = 100,
		opts?: EventGetOpts,
	): Promise<PDEvent[]> {
		// Delegate to REST; if you *really* want KQL, we can add it later.
		return this.getRest(limit, opts);
	}

	/** Optional: Outlook /me/events (disabled by default) */
	// async getOutlook(limit = 10): Promise<PDEvent[]> {
	//   const client: MSGraphClientV3 = await this.pnpWrapper.msGraphClient("3");
	//   const res = await client.api("/me/events")
	//     .select("id,subject,start,end,location,webLink")
	//     .orderby("start/dateTime ASC")
	//     .top(limit)
	//     .get();
	//   const rows = (res.value || []) as Array<{ id:string; subject:string; start?:{dateTime:string}; end?:{dateTime:string}; location?:{displayName?:string}; webLink?:string }>;
	//   return rows.map(e => ({
	//     id: e.id,
	//     title: e.subject ?? "(untitled)",
	//     date: e.start?.dateTime,
	//     endDate: e.end?.dateTime,
	//     location: e.location?.displayName,
	//     detailsUrl: e.webLink,
	//   }));
	// }
}
