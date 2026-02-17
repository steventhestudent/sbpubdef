import { PNPWrapper } from "@utils/PNPWrapper";
import { RoleKey } from "@api/config";

export default interface RoleBasedViewProps {
	userGroupNames: string[];
	pnpWrapper: PNPWrapper;
	sourceRole?: RoleKey;
}
