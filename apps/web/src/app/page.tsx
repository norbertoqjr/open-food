'use client';

import type { ProductSummary, RecentSearchItem } from '@open-food/shared';
import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { LocaleSelector } from '@/components/locale-selector';
import { ProductCard } from '@/components/product-card';
import { RecentSearchesList } from '@/components/recent-searches-list';
import { SearchForm } from '@/components/search-form';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/format-number';
import { ApiError, getRecentSearches, searchProducts } from '@/lib/api';
import { useLocale } from '@/lib/locale-context';

type SearchState = | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; items: ProductSummary[]; total: number };

export default function Home() {
  const { locale, t } = useLocale();
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({ status: 'idle' });
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);
  const hasSearchedRef = useRef(false);

  const runSearch = useCallback(async (nextQuery: string) => {
    hasSearchedRef.current = true;
    setQuery(nextQuery);
    setState({ status: 'loading' });

    try {
      const result = await searchProducts(nextQuery, locale);
      setState({ status: 'success', items: result.items, total: result.total });
      setRecentSearches(await getRecentSearches());
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t.searchFailedError;
      setState({ status: 'error', message });
    }
  }, [locale, t.searchFailedError]);

  useEffect(() => {
    getRecentSearches()
      .then(setRecentSearches)
      .catch(() => setRecentSearches([]));
  }, []);

  // Re-run the active search when the language changes, so product names
  // switch to the new locale rather than staying stuck in the old one.
  useEffect(() => {
    if (hasSearchedRef.current && query) {
      runSearch(query);
    }
    // Only a locale change should retrigger this; runSearch and query are
    // intentionally excluded since they change on every search too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  return (
    <main className="flex flex-1 flex-col items-center gap-8 px-6 py-16">
      <div className="flex w-full max-w-4xl justify-end">
        <LocaleSelector />
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">{t.appTitle}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.appTagline}</p>
      </div>

      <SearchForm query={query} onSearch={runSearch} isSearching={state.status === 'loading'} />

      <RecentSearchesList items={recentSearches} onSelect={runSearch} />

      {state.status === 'loading' ? (
        <div
          className={[
            'grid w-full max-w-4xl grid-cols-2 gap-4',
            'sm:grid-cols-3 md:grid-cols-4',
          ].join(' ')}
        >
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : null}

      {state.status === 'error' ? (
        <p role="alert" className="text-sm text-destructive">{state.message}</p>
      ) : null}

      {state.status === 'success' && state.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noResultsFor(query)}</p>
      ) : null}

      {state.status === 'success' && state.items.length > 0 ? (
        <div className="flex w-full max-w-4xl flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t.resultsCount(formatNumber(state.total, locale))}
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {state.items.map((item) => (
              <ProductCard key={item.id} {...item} />
            ))}
          </div>
        </div>
      ) : null}
    </main>
  );
}
