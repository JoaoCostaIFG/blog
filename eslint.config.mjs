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
]);

export default eslintConfig;
