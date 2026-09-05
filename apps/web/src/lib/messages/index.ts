import type { Locale } from '@open-food/shared';
import { de } from './de';
import { en } from './en';
import { fr } from './fr';
import { nl } from './nl';

export type Messages = typeof en;

export const messages: Record<Locale, Messages> = {
  en, nl, de, fr,
};
