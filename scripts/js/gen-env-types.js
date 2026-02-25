"use strict";
module.exports = function () {
	const fs = require("fs");
	const path = require("path");
	const dotenv = require("dotenv");

	const envFile = `.env.public.${!process.env.NODE_ENV ? "dev" : "prod"}`;

	const envPath = path.join(__dirname, "..", "..", "config", envFile);
	if (!fs.existsSync(envPath)) {
		console.error(`[gen-env-types] Missing: ${envPath}`);
		process.exit(1);
	}

	const parsed = dotenv.parse(fs.readFileSync(envPath, "utf8"));
	const keys = Object.keys(parsed).sort();

	const outPath = path.join(
		__dirname,
		"..",
		"..",
		"src",
		"type",
		"env.global.generated.d.ts",
	);
	fs.mkdirSync(path.dirname(outPath), { recursive: true });

	// Make sure keys are valid TS identifiers; if not, quote them
	const prop = (k) =>
		/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : JSON.stringify(k);

	const lines = [];
	lines.push("// AUTO-GENERATED FILE. DO NOT EDIT.");
	lines.push(`// Source: config/${envFile}`);
	lines.push("");
	lines.push("export {};");
	lines.push("");
	lines.push("declare global {");
	lines.push("  /**");
	lines.push("   * Public build-time env injected client-side.");
	lines.push("   * Do NOT store secrets here.");
	lines.push("   */");
	lines.push("  const ENV: typeof __ENV_CONST;");
	lines.push("  const __ENV_CONST: {");
	for (const k of keys) {
		const v = parsed[k];
		// value as a string literal type
		lines.push(`    readonly ${prop(k)}: ${JSON.stringify(v)};`);
	}
	lines.push("  };");
	lines.push("}");
	lines.push("");

	fs.writeFileSync(outPath, lines.join("\n"), "utf8");
	console.log(`[gen-env-types] Wrote ${outPath} (${keys.length} keys)`);
};
