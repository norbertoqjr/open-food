import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { env } from '@/lib/env';
import { LocaleProvider } from '@/lib/locale-context';
import { HtmlLang } from '@/lib/html-lang';
import { SubscriptionProvider } from '@/lib/subscription-context';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const SITE_NAME = 'Open Food';
const DESCRIPTION = 'Search packaged foods by name or brand, and see ingredients, '
  + 'allergens and nutrition sourced from Open Food Facts.';

export const metadata: Metadata = {
  // Everything canonical and Open Graph resolves against this, so relative
  // paths below become absolute without repeating the origin.
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  // Product pages set their own title through this template.
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: DESCRIPTION,
    url: '/',
  },
  twitter: { card: 'summary', title: SITE_NAME, description: DESCRIPTION },
};

const SITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  description: DESCRIPTION,
  url: env.NEXT_PUBLIC_SITE_URL,
  inLanguage: ['en', 'nl', 'de', 'fr'],
  potentialAction: {
    '@type': 'SearchAction',
    // Points at the real search parameter this app uses, so the action
    // describes something that actually works rather than a guess.
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
  // The catalogue is not this site's work, and saying so in markup is the
  // same attribution the footer makes to a reader.
  isBasedOn: 'https://world.openfoodfacts.org/',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // lang starts at the default and is corrected on the client by HtmlLang
    // once the stored locale is known: the selected language is client-only
    // state, and a screen reader must not keep announcing French copy in an
    // English voice.
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* Site-level schema. SearchAction describes the one thing this app
            does, so an engine can offer the search box directly; rendered in
            the root layout because it is true of every route and must be in
            the served HTML, not added by script. */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD) }}
        />
        <LocaleProvider>
          <HtmlLang />
          <SubscriptionProvider>
            <SiteHeader />
            {children}
            <SiteFooter />
          </SubscriptionProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
