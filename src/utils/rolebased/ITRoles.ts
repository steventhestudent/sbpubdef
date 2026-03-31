import * as Utils from "@utils";

export default function (): string[] {
	return ENV.IT_ROLES.split(" ").map(($0, i) => Utils.ENV_ROLE($0));
}
