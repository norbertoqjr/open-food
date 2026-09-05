'use client';

import { useLocale } from '@/lib/locale-context';

// Where the data comes from belongs on the page, not only in the README: the
// whole catalogue is Open Food Facts', and attribution is the honest way to
// present borrowed data.
export function SiteFooter() {
  const { t } = useLocale();

  return (
    <footer className="mt-auto border-t border-border">
      <div
        className={[
          'mx-auto flex w-full max-w-[1440px] flex-col gap-2 px-5',
          'py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-16',
        ].join(' ')}
      >
        <p className="type-caption text-muted-foreground">
          {t.footerAttribution}
          {' '}
          <a
            href="https://world.openfoodfacts.org/"
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Open Food Facts
          </a>
        </p>
        <p className="type-caption text-muted-foreground">{t.footerNote}</p>
      </div>
    </footer>
  );
}
