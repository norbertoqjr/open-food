import { nest } from "../../eslint.config.base.mjs";

export default [
  ...nest({ tsconfigRootDir: import.meta.dirname }),
  { ignores: ["dist/", "coverage/", "src/generated/"] },
];
