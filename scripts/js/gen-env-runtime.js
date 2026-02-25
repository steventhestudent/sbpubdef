"use strict";

module.exports = function () {
	const fs = require("fs");
	const path = require("path");
	const dotenv = require("dotenv");

	const envFile = `.env.public.${!process.env.NODE_ENV ? "dev" : "prod"}`;

	const envPath = path.join(__dirname, "..", "..", "config", envFile);
	if (!fs.existsSync(envPath)) {
		console.warn(`[gen-env-runtime] Missing: ${envPath} (skipping)`);
		process.exit(0);
	}

	const parsed = dotenv.parse(fs.readFileSync(envPath, "utf8"));

	const outPath = path.join(
		__dirname,
		"..",
		"..",
		"src",
		"type",
		"env.generated.ts",
	);
	fs.mkdirSync(path.dirname(outPath), { recursive: true });

	const content = `// AUTO-GENERATED FILE. DO NOT EDIT.
// Source: config/${envFile}

declare global {
  interface Window {
    ENV?: Record<string, string>;
  }
}

const ENV_VALUE = ${JSON.stringify(parsed, null, 2)} as const;

window.ENV = window.ENV || {};
Object.assign(window.ENV, ENV_VALUE);

export const ENV = window.ENV as Record<string, string>;
`;

	fs.writeFileSync(outPath, content, "utf8");
	console.log(
		`[gen-env-runtime] Wrote ${outPath} (${Object.keys(parsed).length} keys)`,
	);
};
