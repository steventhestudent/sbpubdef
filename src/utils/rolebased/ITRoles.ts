import { ENV_ROLE } from "@utils/rolebased/ENV";

export default function (): string[] {
	return ENV.IT_ROLES.split(" ").map(($0, i) => ENV_ROLE($0));
}
