export function load(fn: () => Promise<void>): void {
	setTimeout(async () => await fn());
}

const MAX_CACHE_LOAD_T = 100; // after 100ms considered a non-cached request
export function loadCachedThenFresh(fn: () => Promise<void>): void {
	setTimeout(async () => {
		const t0 = new Date();
		await fn(); // cacheVal: "true", loads instantly after loading it 1st time (per session (sessionStorage))
		const t1 = new Date();
		if (t1.getTime() - t0.getTime() < MAX_CACHE_LOAD_T) {
			await fn(); // cacheVal: "true" (notice: since cacheVal is string "true" not bool true, cache is false for subsequent requests (...so we re-reload here (if initially the cache was loaded))
			console.log(
				"loadCachedThenRefresh part 1/2:",
				t1.getTime() - t0.getTime(),
				"ms (cached), part 2/2",
				new Date().getTime() - t1.getTime(),
				"ms (non-cached req.)",
			);
		} else
			console.log(
				"loadCachedThenRefresh part 1/1:",
				t1.getTime() - t0.getTime(),
				"ms (non-cached req.)",
			);
	});
}
