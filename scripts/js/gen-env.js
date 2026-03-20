module.exports = () =>
	require("./gen-env-types")(require("./gen-env-runtime")());
