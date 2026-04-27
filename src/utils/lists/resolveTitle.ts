export async function resolveTitle(title: string): Promise<string> {
	const key = title.trim();
	const cached = this.resolvedTitles.get(key);
	if (cached) return cached;

	const web = this.web();

	// Fast path
	try {
		await web.lists.getByTitle(key).select("Id")();
		this.resolvedTitles.set(key, key);
		return key;
	} catch {
		// fall through
	}

	const all: Array<{ Title: string }> = await web.lists.select("Title")();

	const canonicalize = (s: string): string => s.trim().toLowerCase();

	const normalize = (s: string): string =>
		s.trim().toLowerCase().replace(/\s+/g, "");

	const variants = (s: string): string[] => {
		const raw = s.trim();
		const out = new Set<string>();

		if (!raw) return [];

		// original
		out.add(raw);

		// insert space before trailing/embedded digits: Assignments1 -> Assignments 1
		out.add(raw.replace(/([a-zA-Z])(\d+)/g, "$1 $2"));

		// drop trailing digits: Assignments1 -> Assignments
		out.add(raw.replace(/\d+$/, ""));

		// both
		out.add(raw.replace(/\d+$/, "").replace(/([a-zA-Z])(\d+)/g, "$1 $2"));

		return Array.from(out).filter(Boolean);
	};

	type Match = { title: string; score: number };

	const inputVariants = variants(key);
	const listTitles = all
		.map((l) => String(l?.Title ?? "").trim())
		.filter(Boolean);

	let best: Match | undefined;

	const consider = (candidateTitle: string, score: number): void => {
		if (!best || score < best.score) {
			best = { title: candidateTitle, score };
		}
	};

	for (const listTitle of listTitles) {
		const listCanonical = canonicalize(listTitle);
		const listNormalized = normalize(listTitle);

		for (const v of inputVariants) {
			const vCanonical = canonicalize(v);
			const vNormalized = normalize(v);

			// 1. exact case-insensitive
			if (listCanonical === vCanonical) consider(listTitle, 1);

			// 2. whitespace-insensitive
			if (listNormalized === vNormalized) consider(listTitle, 2);

			// 3. prefix on normalized form as weakest fallback
			if (vNormalized && listNormalized.startsWith(vNormalized)) {
				consider(listTitle, 3);
			}
		}
	}

	const resolved = best ? best.title : key;
	this.resolvedTitles.set(key, resolved);
	return resolved;
}
