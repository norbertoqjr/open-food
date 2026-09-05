import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Checkout return pages are per-session dead ends: they carry a
        // `next` parameter, say nothing without one, and would otherwise
        // accumulate as near-duplicate thin pages in an index.
        disallow: ['/subscription/'],
      },
    ],
    sitemap: new URL('/sitemap.xml', env.NEXT_PUBLIC_SITE_URL).toString(),
  };
}
