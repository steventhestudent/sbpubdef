/*
 * User webpack settings file. You can add your own settings here.
 * Changes from this file will be merged into the base webpack configuration file.
 * This file will not be overwritten by the subsequent spfx-fast-serve calls.
 */

/* fast-serve/webpack.extend.js */
/*
 * User webpack settings file. You can add your own settings here.
 * Changes from this file will be merged into the base webpack configuration file.
 * This file will not be overwritten by the subsequent spfx-fast-serve calls.
 */

const { exec } = require("node:child_process");

class FastServeRebuildLoggerPlugin {
	constructor(options = {}) {
		this.options = {
			runCommandOnRebuild: false, // set true if you want to execute a command
			command: "pnpm run theme:hook", // change to whatever you want
			...options,
		};
		this._builtOnce = false;
	}

	apply(compiler) {
		compiler.hooks.watchRun.tapAsync(
			"FastServePreBuildHook",
			(compiler, callback) => {
				const isRebuild = this._builtOnce;
				const changed = compiler.modifiedFiles
					? Array.from(compiler.modifiedFiles)
					: [];

				console.log("\n[webpack.extend.js] PRE-BUILD hook fired");
				console.log("[webpack.extend.js] rebuild:", isRebuild);
				console.log(
					"[webpack.extend.js] changed files:",
					changed.length,
				);
				if (
					changed.filter(
						(el, i) =>
							!(
								el.endsWith(".generated.d.ts") ||
								el.endsWith(".generated.ts")
							),
					).length > 0
				) {
					console.log(
						`rebuild triggered by changed files: `,
						JSON.stringify(changed),
					);
					// writes src/type/env.global.generated.d.ts (provide autocomplete) // writes src/type/env.generated.ts (sets ENV) (imported on src/utils/CommonWebPartImports)
					require("../scripts/js/gen-env");
				}
				console.log("[webpack.extend.js] pre-build work finished");
				callback();
			},
		);

		// Fires when webpack begins a (re)compile in watch mode.
		compiler.hooks.watchRun.tap("FastServeRebuildLoggerPlugin", (comp) => {
			const changed = comp.modifiedFiles
				? Array.from(comp.modifiedFiles)
				: compiler.modifiedFiles
					? Array.from(compiler.modifiedFiles)
					: [];

			const label = this._builtOnce
				? "INCREMENTAL REBUILD"
				: "INITIAL BUILD";
			const ts = new Date().toISOString();

			console.log(`\n[webpack.extend.js] ${label} started @ ${ts}`);
			if (changed.length) {
				console.log(
					`[webpack.extend.js] changed files (${changed.length}):`,
				);
				for (const f of changed) console.log(`  - ${f}`);
			}
		});

		// Fires when webpack finishes a compile (success or error).
		compiler.hooks.done.tap("FastServeRebuildLoggerPlugin", (stats) => {
			const ts = new Date().toISOString();
			const hasErrors = stats.hasErrors();
			const hasWarnings = stats.hasWarnings();
			const mode = stats.compilation?.options?.mode;

			console.log(
				`[webpack.extend.js] build done @ ${ts} | mode=${mode} | errors=${hasErrors} | warnings=${hasWarnings}`,
			);

			// Only treat subsequent builds as "rebuilds"
			if (this._builtOnce && this.options.runCommandOnRebuild) {
				console.log(
					`[webpack.extend.js] running: ${this.options.command}`,
				);
				exec(this.options.command, { stdio: "inherit" }, (err) => {
					if (err)
						console.error(
							"[webpack.extend.js] hook command failed:",
							err,
						);
				});
			}

			this._builtOnce = true;
		});
	}
}

/**
 * you can add your project related webpack configuration here, it will be merged using webpack-merge module
 * i.e. plugins: [new webpack.Plugin()]
 */
const webpackConfig = {
	plugins: [
		new FastServeRebuildLoggerPlugin({
			runCommandOnRebuild: false, // flip to true when you’re ready
			command: "pnpm run theme:hook",
		}),
	],
};

/**
 * For even more fine-grained control, you can apply custom webpack settings using below function
 * @param {object} initialWebpackConfig - initial webpack config object
 * @param {object} webpack - webpack object, used by SPFx pipeline
 * @returns webpack config object
 */
const transformConfig = function (initialWebpackConfig, webpack) {
	// transform the initial webpack config here, i.e.
	// initialWebpackConfig.plugins.push(new webpack.Plugin()); etc.

	return initialWebpackConfig;
};

module.exports = {
	webpackConfig,
	transformConfig,
};
