import js from "@eslint/js";
import tseslint from "typescript-eslint";

export const baseConfig = tseslint.config(
	js.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
			},
		},
		rules: {
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
				},
			],
			"@typescript-eslint/no-explicit-any": "warn",
		},
	},
	{
		ignores: [
			"**/dist/**",
			"**/build/**",
			"**/node_modules/**",
			"**/.wrangler/**",
			"**/drizzle/**",
			"**/.expo/**",
			"**/.astro/**",
		],
	},
);
