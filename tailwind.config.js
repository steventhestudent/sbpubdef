/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{ts,tsx,scss,html}"],
	theme: {
		extend: {},
	},
	plugins: [
		require("tailwindcss-multi"), // ✅ this is the correct place
	],
};
