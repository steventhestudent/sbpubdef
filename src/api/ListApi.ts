import { BaseApi, StrategyOpts } from "@api/BaseApi";
import { IList } from "@pnp/sp/lists";
import "@pnp/sp/security";
import { PermissionKind } from "@pnp/sp/security";

export abstract class ListApi<
	TRow,
	TGetOpts extends StrategyOpts = StrategyOpts,
	TCreateInput = never,
> extends BaseApi<TRow, TGetOpts, TCreateInput> {
	listName: string;
	listRef: IList;
	protected override preprocess(opts?: TGetOpts): void {
		super.preprocess(opts);
		this.withSites(["/sites/" + ENV.HUB_NAME]);
	}

	/*
		hub search: (aggregate across site collections)
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

	/* delete */
	async deleteItem(itemId: number): Promise<void> {
		await this.list().items.getById(itemId).delete();
		console.log(`itemId ${itemId} deleted`);
	}

	/* update */
	async updateItem(
		itemId: number,
		updatedData: Partial<TRow>,
	): Promise<void> {
		await this.list().items.getById(itemId).update(updatedData);
		console.log(`itemId ${itemId} updated`);
	}

	/* misc */
	list(): IList {
		if (this.listRef) return this.listRef;
		this.listRef = this.web().lists.getByTitle(this.listName);
		return this.listRef;
	}

	async currentUserCanWrite(): Promise<boolean> {
		try {
			// "EditListItems" is the minimal permission that enables list item writes/updates.
			return await this.list().currentUserHasPermissions(
				PermissionKind.EditListItems,
			);
		} catch (e) {
			// If permissions can't be evaluated (feature/endpoint blocked), default to read-only.
			console.warn(
				`Failed to evaluate write permissions for list "${this.listName}"`,
				e,
			);
			return false;
		}
	}
}
