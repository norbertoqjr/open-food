import * as z from 'zod';

// Next.js inlines NEXT_PUBLIC_* variables at build time; this schema documents
// and validates the one the web app is allowed to read.
export const webEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url(),
});

export type WebEnv = z.infer<typeof webEnvSchema>;
