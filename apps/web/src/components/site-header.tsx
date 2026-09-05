'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CurrentUser } from '@/components/current-user';
import { LocaleSelector } from '@/components/locale-selector';
import { useLocale } from '@/lib/locale-context';

// Persistent so the language selector is reachable from the product page
// too, which re-fetches localized product data when it changes.
export function SiteHeader() {
  const { t } = useLocale();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-6">
        <h1 className="flex">
          <Link
            href="/"
            className="rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {/* The wordmark already reads "Open Food", so the alt text is the
                app name rather than a description of the image. */}
            <Image
              src="/open-food-logo.png"
              alt={t.appTitle}
              width={2018}
              height={458}
              className="h-7 w-auto"
              priority
            />
          </Link>
        </h1>
        <div className="flex items-center gap-4">
          <LocaleSelector />
          <CurrentUser />
        </div>
      </div>
    </header>
  );
}
