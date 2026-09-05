import { next } from '../../eslint.config.base.mjs';

export default [
  ...next({ tsconfigRootDir: import.meta.dirname }),
  { ignores: ['.next/', 'out/', 'build/', 'next-env.d.ts'] },
  {
    // shadcn/ui generates these from its registry; they're ours to edit per
    // the project's shadcn skill, but re-wrapping every long Tailwind
    // variant-map string on each `shadcn add` isn't worth the churn, and
    // React's own destructured-default-parameter pattern (`size = 'default'`)
    // is not the legacy class-component defaultProps this rule expects.
    files: ['src/components/ui/**/*.tsx'],
    rules: {
      '@stylistic/max-len': 'off',
      'react/require-default-props': 'off',
    },
  },
];
