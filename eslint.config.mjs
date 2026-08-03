import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTypescript,
	// Rule overrides
	{
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
		},
	},
	// Workaround for eslint-plugin-react incompatibility with ESLint 10
	// (jsx-eslint/eslint-plugin-react#3977, vercel/next.js#89764)
	{
		settings: {
			react: { version: "19" },
		},
	},
]);

export default eslintConfig;
