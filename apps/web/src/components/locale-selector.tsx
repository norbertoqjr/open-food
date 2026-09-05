'use client';

import { SUPPORTED_LOCALES } from '@open-food/shared';
import { useLocale } from '@/lib/locale-context';
import { Button } from '@/components/ui/button';

const LOCALE_LABELS: Record<(typeof SUPPORTED_LOCALES)[number], string> = {
  en: 'EN', nl: 'NL', de: 'DE', fr: 'FR',
};

export function LocaleSelector() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex gap-1" role="group" aria-label="Language">
      {SUPPORTED_LOCALES.map((option) => (
        <Button
          key={option}
          type="button"
          size="sm"
          variant={option === locale ? 'default' : 'outline'}
          aria-pressed={option === locale}
          onClick={() => setLocale(option)}
        >
          {LOCALE_LABELS[option]}
        </Button>
      ))}
    </div>
  );
}
