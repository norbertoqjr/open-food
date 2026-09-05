'use client';

import { SUPPORTED_LOCALES, isSupportedLocale } from '@open-food/shared';
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
      <label
        htmlFor={selectId}
        className="hidden text-xs font-medium text-muted-foreground sm:block"
      >
        {t.selectLanguageLabel}
      </label>
      <select
        id={selectId}
        value={locale}
        // A native select keeps the platform's own picker on touch devices
        // and stays keyboard-navigable without any custom listbox code.
        onChange={(event) => {
          const next = event.target.value;
          if (isSupportedLocale(next)) setLocale(next);
        }}
        className={[
          'h-8 cursor-pointer rounded-lg border border-border bg-background px-2',
          'text-sm font-medium outline-none transition-colors',
          'hover:bg-muted focus-visible:border-ring focus-visible:ring-3',
          'focus-visible:ring-ring/50 dark:border-input dark:bg-input/30',
        ].join(' ')}
      >
        {SUPPORTED_LOCALES.map((option) => (
          <option key={option} value={option}>
            {LOCALE_LABELS[option]}
          </option>
        ))}
      </select>
    </div>
  );
}
