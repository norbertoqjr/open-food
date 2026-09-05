import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { LocaleProvider } from '@/lib/locale-context';
import { HtmlLang } from '@/lib/html-lang';
import { SubscriptionProvider } from '@/lib/subscription-context';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Open Food',
  description: 'Search packaged foods by name, brand, and nutrition.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // lang starts at the default and is corrected on the client by HtmlLang
    // once the stored locale is known: the selected language is client-only
    // state, and a screen reader must not keep announcing French copy in an
    // English voice.
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
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
