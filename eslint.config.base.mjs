// Shared Airbnb ESLint base for every workspace in this repo.
//
// Each app imports this by relative path from its own eslint.config.mjs.
// Plugin resolution follows this file's location, and npm workspaces hoist
// its dependencies to the repo root, so apps need no plugin devDependencies
// of their own — only this file's package needs eslint-config-airbnb-extended.
//
// Composition verified against eslint-config-airbnb-extended's own working
// templates (github.com/eslint-config/airbnb-extended, apps/build-templates):
// each `plugins.*` entry is a ready flat-config object that registers a
// plugin, not a bare plugin instance, and must be spread in alongside the
// matching `configs.*` entry or its rules fail with "could not find plugin".
//
//   import { next } from "../../eslint.config.base.mjs";
//   export default [
//     ...next({ tsconfigRootDir: import.meta.dirname }),
//     { ignores: ["dist/", ".next/"] },
//   ];

import js from "@eslint/js";
import { configs, plugins } from "eslint-config-airbnb-extended";

// typescript-eslint's type-aware rules need to know where tsconfig.json lives.
const typeAware = (tsconfigRootDir) => ({
  languageOptions: {
    parserOptions: { projectService: true, tsconfigRootDir },
  },
});

const overrides = {
  name: "airbnb-base/overrides",
  rules: {
    // Airbnb predates ES modules with named-only exports; a module with one
    // export is not automatically a default export.
    "import-x/prefer-default-export": "off",
    // Conflicts with NestJS decorators and Next.js route conventions.
    "import-x/no-extraneous-dependencies": ["error", { devDependencies: true }],
    // Every app's eslint.config.mjs legitimately reaches this file via a
    // relative path across a workspace boundary; the rule's autofix rewrites
    // that into a bare `open-food/...` specifier that does not resolve,
    // since the root package has no matching `exports` entry.
    "import-x/no-relative-packages": "off",
    // Airbnb's "never" setting assumes CommonJS, where extensionless
    // relative imports are the norm. This repo uses NodeNext ESM, which
    // requires an explicit extension on every relative specifier.
    "import-x/extensions": "off",
  },
};

const jsConfig = [
  { name: "js/config", ...js.configs.recommended },
  plugins.stylistic,
  plugins.importX,
  ...configs.base.recommended,
];

const typescriptConfig = [plugins.typescriptEslint, ...configs.base.typescript];

export const base = ({ tsconfigRootDir } = {}) => [
  ...jsConfig,
  ...typescriptConfig,
  typeAware(tsconfigRootDir),
  overrides,
];

// Next.js frontend: Airbnb base + React + a11y + Next rules.
export const next = ({ tsconfigRootDir } = {}) => [
  ...jsConfig,
  plugins.react,
  plugins.reactHooks,
  plugins.reactA11y,
  plugins.next,
  ...configs.next.recommended,
  ...typescriptConfig,
  ...configs.next.typescript,
  typeAware(tsconfigRootDir),
  overrides,
];

// NestJS backend: Airbnb base + Node rules, no React.
export const nest = ({ tsconfigRootDir } = {}) => [
  ...jsConfig,
  plugins.node,
  ...configs.node.recommended,
  ...typescriptConfig,
  typeAware(tsconfigRootDir),
  {
    ...overrides,
    rules: {
      ...overrides.rules,
      // NestJS injects dependencies through constructor parameter decorators.
      "no-useless-constructor": "off",
      "@typescript-eslint/no-useless-constructor": "off",
    },
  },
];

export default { base, next, nest };
