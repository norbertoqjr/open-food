import { webEnvSchema } from '@open-food/shared';
import * as z from 'zod';

// Validated once at module load (first import, server-side) rather than on
// every read, so a misconfigured deployment fails immediately.
const result = webEnvSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

if (!result.success) {
  throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
}

export const env = result.data;
