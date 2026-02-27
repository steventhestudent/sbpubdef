"use strict";

module.exports = function (finalEnv) {
	const fs = require("fs");
	const path = require("path");

	if (!finalEnv || typeof finalEnv !== "object") finalEnv = {};

	const outPath = path.join(
		__dirname,
		"..",
		"..",
		"src",
		"type",
		"env.global.generated.d.ts",
	);
	fs.mkdirSync(path.dirname(outPath), { recursive: true });

	const prop = (k) =>
		/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : JSON.stringify(k);

	const finalKeys = Object.keys(finalEnv).sort();

	const lines = [];
	lines.push("// AUTO-GENERATED FILE. DO NOT EDIT.");
	lines.push("// Source: generated from env.generated.ts shape");
	lines.push("");
	lines.push("export {};");
	lines.push("");
	lines.push("declare global {");
	lines.push("  /**");
	lines.push("   * Public env injected client-side.");
	lines.push("   * Do NOT store secrets here.");
	lines.push("   */");
	lines.push("  const ENV: typeof __ENV_CONST;");
	lines.push("  const __ENV_CONST: {");

	for (const k of finalKeys) {
		const v = finalEnv[k];

		if (Array.isArray(v)) {
			const tuple = v.map((s) => JSON.stringify(s)).join(", ");
			lines.push(`    readonly ${prop(k)}: [${tuple}];`);
		} else {
			// keep values typed as string literal types
			lines.push(`    readonly ${prop(k)}: ${JSON.stringify(v)};`);
		}
	}

	lines.push("  };");
	lines.push("}");
	lines.push("");

	fs.writeFileSync(outPath, lines.join("\n"), "utf8");
	console.log(`[gen-env-types] Wrote ${outPath} (${finalKeys.length} props)`);
};
