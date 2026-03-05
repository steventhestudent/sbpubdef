"use strict";

module.exports = function () {
	const fs = require("fs");
	const path = require("path");
	const dotenv = require("dotenv");

	const envPath = path.join(__dirname, "..", "..", "config");
	const envs = [
		".env.public",
		`.env.public.${process.env.NODE_ENV === "production" ? "prod" : "dev"}`,
	];

	const parseIfExists = (p) =>
		fs.existsSync(p) ? dotenv.parse(fs.readFileSync(p, "utf8")) : {};

	let parsed = {};
	envs.forEach((env) => {
		parsed = { ...parsed, ...parseIfExists(envPath + "/" + env) };
	});

	const keys = Object.keys(parsed).sort();
	/** group config */
	const COMPOUND_PREFIXES = new Set(["SP"]); // foreach prefix group all these into one _KEYS

	function groupForKey(k) {
		const parts = k.split("_");
		if (parts.length >= 2) {
			const two = `${parts[0]}_${parts[1]}`;
			if (COMPOUND_PREFIXES.has(two)) return two;
		}
		return parts[0];
	}

	/** @type {Record<string, string[]>} */
	const groupKeys = {};

	for (const k of keys) {
		const g = groupForKey(k);
		(groupKeys[g] ||= []).push(k);
	}

	for (const g of Object.keys(groupKeys)) groupKeys[g].sort();

	const finalEnv = { ...parsed };
	for (const g of Object.keys(groupKeys)) {
		if (groupKeys[g].length > 1) {
			finalEnv[`${g}_KEYS`] = groupKeys[g];
		}
	}

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
// Source: config/.env.public + config/.env.public.dev || config/.env.public.prod

declare global {
  interface Window {
    ENV?: {} | typeof ENV_VALUE;
  }
}

const ENV_VALUE = ${JSON.stringify(finalEnv, null, 2)} as const;

if (!window.ENV) {
  window.ENV = {};
  Object.assign(window.ENV, ENV_VALUE);
}

export const ENV = window.ENV as typeof ENV_VALUE;
`;

	fs.writeFileSync(outPath, content, "utf8");

	console.log(
		`[gen-env-runtime] Wrote ${outPath} (${keys.length} keys, ${Object.keys(groupKeys).length} groups)`,
	);
	return finalEnv;
};
