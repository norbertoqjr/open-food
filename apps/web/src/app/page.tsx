'use client';

import type { ProductSummary, RecentSearchItem } from '@open-food/shared';
import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { ProductCard } from '@/components/product-card';
import { RecentSearchesList } from '@/components/recent-searches-list';
import { SearchForm } from '@/components/search-form';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/format-number';
import { ApiError, getRecentSearches, searchProducts } from '@/lib/api';
import { useLocale } from '@/lib/locale-context';

type SearchState = { status: 'idle' }
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
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-5">
          <p
            className={[
              'max-w-[55ch] text-pretty text-2xl font-semibold',
              'leading-snug tracking-tight',
            ].join(' ')}
          >
            {t.appTagline}
          </p>
          <SearchForm query={query} onSearch={runSearch} isSearching={state.status === 'loading'} />
          <RecentSearchesList items={recentSearches} onSelect={runSearch} />
        </div>

        <div aria-live="polite" aria-busy={state.status === 'loading'}>
          {state.status === 'idle' ? (
            <p className="border-t border-border pt-8 text-sm text-muted-foreground">
              {t.searchIdleHint}
            </p>
          ) : null}

          {state.status === 'loading' ? (
            <div
              className={[
                'grid grid-cols-2 gap-4 border-t border-border pt-8',
                'sm:grid-cols-3 md:grid-cols-4',
              ].join(' ')}
            >
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="flex flex-col gap-3">
                  <Skeleton className="aspect-square rounded-xl" />
                  <Skeleton className="h-3.5 w-4/5 rounded-sm" />
                  <Skeleton className="h-3 w-2/5 rounded-sm" />
                </div>
              ))}
            </div>
          ) : null}

          {state.status === 'error' ? (
            <p
              role="alert"
              className="border-t border-border pt-8 text-sm font-medium text-destructive"
            >
              {state.message}
            </p>
          ) : null}

          {state.status === 'success' && state.items.length === 0 ? (
            <p className="border-t border-border pt-8 text-sm text-muted-foreground">
              {t.noResultsFor(query)}
            </p>
          ) : null}

          {state.status === 'success' && state.items.length > 0 ? (
            <div className="flex flex-col gap-4 border-t border-border pt-6">
              <p className="tabular-figures text-xs text-muted-foreground">
                {t.resultsCount(formatNumber(state.total, locale))}
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {state.items.map((item) => (
                  <ProductCard key={item.id} {...item} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
