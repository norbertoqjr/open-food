import type { Locale } from '@open-food/shared';

// en/nl/de/fr are themselves valid BCP 47 language tags, so no mapping table
// is needed before handing them to Intl.
export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(value);
}
