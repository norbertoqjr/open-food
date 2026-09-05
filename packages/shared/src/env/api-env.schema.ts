import * as z from 'zod';

// Validated once at API boot (see apps/api/src/config/env.validation.ts).
// Keeps every backend secret and connection detail out of the web app.
export const apiEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url(),
  WEB_ORIGIN: z.url(),
  STRIPE_SECRET_KEY: z.string().min(1).startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).startsWith('whsec_'),
  STRIPE_MONTHLY_PRICE_ID: z.string().min(1).startsWith('price_'),
  STRIPE_CHECKOUT_SUCCESS_URL: z.url(),
  STRIPE_CHECKOUT_CANCEL_URL: z.url(),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
