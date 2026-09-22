import { plugin as shadcn } from "@shadcn/lint";
import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTypescript,
	// @shadcn/lint — design system rules for the term-* theme.
	// Rules reference: https://github.com/shadcn-ui/lint#rules
	{
		files: ["**/*.{js,jsx,ts,tsx}"],
		plugins: { shadcn },
		settings: {
			shadcn: {
				// No components.json: point discovery at this project's
				// component directories (imported via the @/ alias).
				ui: ["@/components", "@/app/ui"],
			},
		},
		rules: {
			"shadcn/no-raw-colors": "error",
			"shadcn/require-static-classes": "error",
			"shadcn/no-unknown-classes": "error",
			"shadcn/no-arbitrary-values": "error",
			"shadcn/no-inline-styles": "error",
			// Components own their styling: variants via props, layout and
			// entrance animation on wrapper elements (pattern from page.tsx).
			"shadcn/no-restyle": "error",
		},
	},
	// react-syntax-highlighter's style prop is its theme API (selector-keyed
	// token colors), not a DOM inline style
	{
		files: ["src/lib/blog/BlogMarkdown.tsx"],
		rules: {
			"shadcn/no-inline-styles": "off",
		},
	},
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
