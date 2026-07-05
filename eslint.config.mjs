import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  // 1. Load core recommended base rulesets first
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,

  // 2. Custom project overrides applied last (highest priority)
  {
    files: ["src/**/*.{ts,js,mjs,cjs}"],
    languageOptions: {
      parser: tseslint.parser,
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      "prefer-const": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-undef": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off"
    },
  },
];
