export default function (): string[] {
	return ENV.IT_ROLES.split(" ").map(
		($0, i) => (ENV as unknown as { [key: string]: string })["ROLE_" + $0],
	);
}
