"use strict";

const build = require("@microsoft/sp-build-web");
const path = require("path");

build.addSuppression(
	`Warning - [sass] The local CSS class 'ms-Grid' is not camelCase and will not be type-safe.`,
);

var getTasks = build.rig.getTasks;
build.rig.getTasks = function () {
	var result = getTasks.call(build.rig);

	result.set("serve", result.get("serve-deprecated"));

	return result;
};

// aliases
build.configureWebpack.mergeConfig({
	additionalConfiguration: (generatedConfig) => {
		generatedConfig.resolve = generatedConfig.resolve || {};
		generatedConfig.resolve.alias = {
			...(generatedConfig.resolve.alias || {}),
			"@api": path.resolve(__dirname, "lib/api"),
			"@components": path.resolve(__dirname, "lib/components"),
			"@data": path.resolve(__dirname, "lib/data"),
			"@dist": path.resolve(__dirname, "dist"),
			"@extensions": path.resolve(__dirname, "lib/extensions"),
			"@styles": path.resolve(__dirname, "lib/styles"),
			"@type": path.resolve(__dirname, "lib/types"),
			"@utils": path.resolve(__dirname, "lib/utils"),
			"@webparts": path.resolve(__dirname, "lib/webparts"),
		};
		return generatedConfig;
	},
});

/* this breaks aliases so i commented it out */
// // keep dist on gulp clean
// const { resolve } = path;
// build.configureWebpack.mergeConfig({
// 	additionalConfiguration: (generatedConfig) => {
// 		generatedConfig.resolve.alias = {
// 			...(generatedConfig.resolve.alias || {}),
// 			"@dist": resolve(__dirname, "dist"),
// 		};
// 		return generatedConfig;
// 	},
// });

/* fast-serve */
const { addFastServe } = require("spfx-fast-serve-helpers");
addFastServe(build);
/* end of fast-serve */

build.initialize(require("gulp"));
