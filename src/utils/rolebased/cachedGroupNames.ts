export default function cachedGroupNames(): RoleKey[] {
	return JSON.parse(localStorage.getItem("userGroupNames") || '""') || [];
}
