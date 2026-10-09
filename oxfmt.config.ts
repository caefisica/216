import { defineConfig } from "oxfmt";

export default defineConfig({
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  quoteProps: "as-needed",
  jsxSingleQuote: false,
  trailingComma: "all",
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: "always",
  endOfLine: "lf",
  ignorePatterns: ["worker-configuration.d.ts", "src/lib/db/seeds/catalogue.json"],
  overrides: [
    {
      files: ["**/*.md"],
      options: {
        printWidth: 80,
        proseWrap: "always",
      },
    },
  ],
});
