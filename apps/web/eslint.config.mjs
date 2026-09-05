import { next } from '../../eslint.config.base.mjs';

export default [
  ...next({ tsconfigRootDir: import.meta.dirname }),
  { ignores: ['.next/', 'out/', 'build/', 'next-env.d.ts'] },
];
