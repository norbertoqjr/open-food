import * as z from 'zod';

// A return path is chosen by the client, embedded in the Stripe redirect URL,
// and later navigated to. Only a same-origin relative path is safe:
// "//evil.com" and "/\evil.com" are protocol-relative URLs that browsers
// resolve to another host, and anything carrying a scheme leaves the site.
// Rejecting those is what keeps this from being an open redirect.
export function isSafeReturnPath(value: string): boolean {
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//') || value.startsWith('/\\')) return false;
  return !value.includes('\\') && !/^\/[a-z][a-z0-9+.-]*:/i.test(value);
}

export const checkoutSessionBodySchema = z.object({
  returnTo: z.string().max(2000).refine(isSafeReturnPath, {
    message: 'returnTo must be a relative path on this site',
  }).optional(),
});

export type CheckoutSessionBody = z.infer<typeof checkoutSessionBodySchema>;
