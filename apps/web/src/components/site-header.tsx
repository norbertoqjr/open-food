'use client';

import Image from 'next/image';
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
          'gap-x-4 gap-y-3 px-5 py-4 sm:gap-x-6 sm:px-8 lg:min-h-20 lg:px-16',
        ].join(' ')}
      >
        <Link
          href="/"
          aria-label={t.appTitle}
          className="flex shrink-0 items-center rounded-sm pointer-coarse:min-h-11"
        >
          {/* The lockup already spells out "Open Food", so the wordmark that
              used to sit beside the mark would now read twice. The name stays
              available to assistive tech through the link's aria-label, which
              leaves this image decorative. Rendered at its display size rather
              than its 2018px intrinsic width so the generated srcset tops out
              at a sensible 2x.

              Below sm the box clips the lockup to its leading 33px -- the mark
              is 467 of the artwork's 458 tall, so at h-8 that lands exactly on
              the gap before the "O". The wordmark costs 108px a phone header
              does not have, and shipping the same file cropped beats a second
              asset that could drift away from this one. */}
          <span className="block w-[33px] overflow-hidden sm:w-auto sm:overflow-visible">
            <Image
              src="/open-food-logo.png"
              alt=""
              width={141}
              height={32}
              priority
              className="h-8 w-auto max-w-none"
            />
          </span>
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
