import { PNPWrapper } from "@utils/PNPWrapper";

export default interface RoleBasedViewProps {
	userGroupNames: string[];
	pnpWrapper: PNPWrapper;
	sourceRole?: RoleKey;
}
