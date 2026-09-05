import * as z from 'zod';

// Next.js inlines NEXT_PUBLIC_* variables at build time; this schema documents
// and validates the one the web app is allowed to read.
export const webEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url(),
  // Absolute origin this app is served from. Canonical links, Open Graph
  // tags and the sitemap all have to be absolute, so none of them can be
  // derived from a request path alone.
  NEXT_PUBLIC_SITE_URL: z.url().default('http://localhost:3000'),
});

export type WebEnv = z.infer<typeof webEnvSchema>;
