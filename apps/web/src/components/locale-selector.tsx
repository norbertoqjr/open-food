'use client';

import { SUPPORTED_LOCALES, isSupportedLocale } from '@open-food/shared';
import { ChevronDown } from 'lucide-react';
import { useId } from 'react';
import { useLocale } from '@/lib/locale-context';

// Endonyms: each language is written in itself, so someone who has landed on
// a language they do not read can still find their own. These are the same in
// every locale and so are deliberately not part of the message dictionaries.
const LOCALE_LABELS: Record<(typeof SUPPORTED_LOCALES)[number], string> = {
  en: 'English', nl: 'Nederlands', de: 'Deutsch', fr: 'Français',
};

export function LocaleSelector() {
  const { locale, setLocale, t } = useLocale();
  const selectId = useId();

  return (
    <div className="flex items-center gap-2">
      {/* sr-only rather than hidden: below sm this label is the select's only
          accessible name, and `hidden` took it out of the accessibility tree
          along with the layout, leaving an unlabelled control on exactly the
          devices that lean hardest on the screen reader. */}
      <label
        htmlFor={selectId}
        className="type-caption sr-only text-muted-foreground sm:not-sr-only sm:block"
      >
        {t.selectLanguageLabel}
      </label>
      {/* The browser's own arrow sits hard against the right edge, which
          collides with a pill's curve. appearance-none drops only that
          rendering -- the control stays a real <select>, so touch devices
          still get the platform picker and keyboard behaviour is untouched --
          and the chevron below is placed with padding to clear the radius. */}
      <div className="relative">
        <select
          id={selectId}
          value={locale}
          onChange={(event) => {
            const next = event.target.value;
            if (isSupportedLocale(next)) setLocale(next);
          }}
          className={[
            'min-h-11 w-full cursor-pointer appearance-none rounded-full',
            'border border-border bg-background py-2 pr-10 pl-4 sm:pr-11 sm:pl-5',
            'text-sm font-medium text-foreground outline-none',
            'transition-colors duration-[var(--duration-normal)] ease-[var(--ease)]',
            'hover:bg-muted',
          ].join(' ')}
        >
          {SUPPORTED_LOCALES.map((option) => (
            <option key={option} value={option}>
              {LOCALE_LABELS[option]}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className={[
            'pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 sm:right-4',
            'text-muted-foreground',
          ].join(' ')}
        />
      </div>
    </div>
  );
}
