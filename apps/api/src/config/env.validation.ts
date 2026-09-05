import { apiEnvSchema } from '@open-food/shared';
import * as z from 'zod';

// Passed to ConfigModule.forRoot({ validate }); Nest calls this once at boot
// with the loaded .env plus process.env merged in, before any module resolves
// a value, so a misconfigured deployment fails immediately instead of at the
// point some feature first reads process.env.
export function validate(config: Record<string, unknown>) {
  const result = apiEnvSchema.safeParse(config);

  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }

  return result.data;
}
