'use client';

import { isSupportedLocale, type Locale } from '@open-food/shared';
import {
  createContext, useContext, useEffect, useMemo, useState,
} from 'react';
import { messages, type Messages } from './messages';

const STORAGE_KEY = 'open-food-locale';
const DEFAULT_LOCALE: Locale = 'en';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored && isSupportedLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    // localStorage can throw (private browsing, disabled storage); the
    // selector still works for the session, just without persistence.
    return DEFAULT_LOCALE;
  }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Starts at the default on both server and first client render so
  // hydration matches, then syncs to the stored value once mounted.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    // localStorage isn't available during SSR or the first client render;
    // reading it here (rather than in the initializer) is what keeps
    // hydration consistent.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocaleState(readStoredLocale());
  }, []);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale: (next: Locale) => {
      setLocaleState(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Selection still applies to this session even if it can't persist.
      }
    },
    t: messages[locale],
  }), [locale]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }

  return context;
}
