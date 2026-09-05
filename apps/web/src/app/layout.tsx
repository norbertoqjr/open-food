import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { SiteHeader } from '@/components/site-header';
import { LocaleProvider } from '@/lib/locale-context';
import { SubscriptionProvider } from '@/lib/subscription-context';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Open Food',
  description: 'Search packaged foods by name, brand, and nutrition.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LocaleProvider>
          <SubscriptionProvider>
            <SiteHeader />
            {children}
          </SubscriptionProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
