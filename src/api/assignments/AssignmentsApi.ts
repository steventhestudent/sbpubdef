// AssignmentsApi.ts
import "@pnp/sp/items";
import "@pnp/sp/lists";
import "@pnp/sp/fields";
import { ListApi } from "@api/ListApi";
import { ListResult, PDAssignment } from "@type/PDAssignment";

type AssignGetOpts = { department?: string };

export class AssignmentsApi extends ListApi<PDAssignment, AssignGetOpts> {
	protected async getRest(
		limitPerSite = 50,
		opts?: AssignGetOpts,
	): Promise<PDAssignment[]> {
		const targets = this._sites.length ? this._sites : [""];
		const { department } = opts || {};

		const calls = targets.map(async (siteUrl) => {
			const w = this.pnpWrapper.web(siteUrl);
			const list = w.lists.getByTitle(ENV.LIST_PDASSIGNMENT);

			if (department)
				this.and(
					`${ENV.INTERNALCOLUMN_PDDEPARTMENT} eq '${department.replace(/'/g, "''")}'`,
				);

			const rows = await list.items
				.select(
					"Id",
					"Title",
					"Client",
					"Court",
					"NextHearing",
					"Status",
					"Link",
					// "FileRef",
					ENV.INTERNALCOLUMN_PDDEPARTMENT,
					`${ENV.INTERNALCOLUMN_ASSIGNEDATTORNEYTEAM}/Title`,
					`${ENV.INTERNALCOLUMN_ASSIGNEDATTORNEYTEAM}/EMail`,
				)
				.expand(ENV.INTERNALCOLUMN_ASSIGNEDATTORNEYTEAM)
				.filter(this.odata)
				.orderBy("Id", false)
				.top(limitPerSite)();

			return rows.map((item: ListResult): PDAssignment => {
				const assigned = item[ENV.INTERNALCOLUMN_ASSIGNEDATTORNEYTEAM];
				const assignedPerson = Array.isArray(assigned)
					? assigned[0]
					: assigned;

				return {
					id: item.Id,
					title: item.Title ?? "(untitled)",
					PDDepartment:
						item[ENV.INTERNALCOLUMN_PDDEPARTMENT] ||
						item.PDDepartment ||
						"Everyone",
					caseNumber: item.Title, ///
					client: item.Client,
					court: item.Court,
					nextHearing: item.NextHearing,
					status: item.Status,
					link:
						typeof item.Link === "object" && item.Link?.Url
							? item.Link.Url
							: typeof item.Link === "string"
								? item.Link
								: undefined,
					attorneyEmail: assignedPerson?.EMail || "",
					attorneyName: assignedPerson?.Title || "",
				};
			});
		});

		const settled = await Promise.allSettled(calls);
		const flat: PDAssignment[] = [];
		for (const r of settled)
			if (r.status === "fulfilled") flat.push(...r.value);
		return flat;
	}
}
