export default function loadJSON<T>(
	url: string,
	cb: (data: T | undefined) => void,
): void {
	fetch(url, {
		method: "GET",
		credentials: "same-origin",
		headers: {
			Accept: "application/json",
		},
	})
		.then((response) => {
			if (!response.ok) {
				throw new Error(
					`HTTP ${response.status} ${response.statusText}`,
				);
			}
			return response.json() as Promise<T>;
		})
		.then(cb)
		.catch((error: unknown) => {
			console.error("Error fetching JSON:", error);
			cb(undefined);
		});
}
