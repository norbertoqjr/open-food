import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

// Only the routes this app genuinely owns. Product pages are deliberately
// absent: they are a view onto Open Food Facts' catalogue of millions of
// barcodes, none of which is this site's content, and listing them would be
// both unbounded and a claim to authorship the app cannot make. They stay
// crawlable -- they are simply discovered through search results rather than
// enumerated here.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: new URL('/', env.NEXT_PUBLIC_SITE_URL).toString(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];
}
