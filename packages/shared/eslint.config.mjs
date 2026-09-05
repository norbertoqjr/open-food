import { base } from "../../eslint.config.base.mjs";

export default [
  ...base({ tsconfigRootDir: import.meta.dirname }),
  { ignores: ["dist/"] },
];
