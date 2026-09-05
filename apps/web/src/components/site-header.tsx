'use client';

import Link from 'next/link';
import { CurrentUser } from '@/components/current-user';
import { LocaleSelector } from '@/components/locale-selector';
import { useLocale } from '@/lib/locale-context';

// Static rather than sticky, per the spec: the search field is the anchor of
// this app and it lives in the page, so pinning a bar over the results only
// costs vertical space on the small viewports where they are scarcest.
//
// Persistent so the language can be changed from a product page too, which
// re-fetches that product's localized copy.
export function SiteHeader() {
  const { t } = useLocale();

  return (
    <header className="border-b border-border">
      <div
        className={[
          'mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between',
          'gap-x-6 gap-y-3 px-5 py-4 sm:px-8 lg:min-h-20 lg:px-16',
        ].join(' ')}
      >
        <Link
          href="/"
          aria-label={t.appTitle}
          className="flex shrink-0 items-center gap-2.5 rounded-sm"
        >
          <span
            aria-hidden
            className={[
              'grid size-8 place-items-center rounded-full bg-brand',
              'text-sm font-bold text-on-brand',
            ].join(' ')}
          >
            O
          </span>
          <span className="text-base font-semibold tracking-tight">{t.appTitle}</span>
        </Link>

        {/* Allowed to wrap: German and French labels are long enough to
            overflow a single row on a narrow viewport. */}
        <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
          <LocaleSelector />
          <CurrentUser />
        </div>
      </div>
    </header>
  );
}
