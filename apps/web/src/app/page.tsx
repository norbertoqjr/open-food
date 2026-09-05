'use client';

import type { ProductSummary, RecentSearchItem } from '@open-food/shared';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Suspense, useCallback, useEffect, useState,
} from 'react';
import { ProductCard } from '@/components/product-card';
import { RecentSearchesList } from '@/components/recent-searches-list';
import { SearchForm } from '@/components/search-form';
import { SubscribeBanner } from '@/components/subscribe-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/format-number';
import { ApiError, getRecentSearches, searchProducts } from '@/lib/api';
import { useLocale } from '@/lib/locale-context';

type SearchState = { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; items: ProductSummary[]; total: number };

// The active search lives in the URL (/?q=…) rather than in component state,
// so it survives a reload, restores on back/forward, and can be linked to.
// The effect below is the only thing that runs a search: submitting the form
// just rewrites the URL, which makes that URL the single source of truth
// instead of something kept in sync with a second copy in state.
function HomeSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q')?.trim() ?? '';

  const { locale, t } = useLocale();
  const [state, setState] = useState<SearchState>({ status: 'idle' });
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);

  const handleSearch = useCallback((nextQuery: string) => {
    const trimmed = nextQuery.trim();
    // replace, not push: a search is a refinement of the current view, so it
    // should not bury the previous query in the back stack.
    router.replace(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : '/', { scroll: false });
  }, [router]);

  useEffect(() => {
    getRecentSearches()
      .then(setRecentSearches)
      .catch(() => setRecentSearches([]));
  }, []);

  // Re-runs on a locale change too, so product names switch to the new
  // language rather than staying stuck in the old one.
  useEffect(() => {
    if (!query) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: 'idle' });
      return undefined;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    searchProducts(query, locale)
      .then(async (result) => {
        if (cancelled) return;
        setState({ status: 'success', items: result.items, total: result.total });
        setRecentSearches(await getRecentSearches());
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof ApiError ? error.message : t.searchFailedError;
        setState({ status: 'error', message });
      });

    return () => {
      cancelled = true;
    };
  }, [query, locale, t.searchFailedError]);

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
          <SubscribeBanner />
          <SearchForm
            query={query}
            onSearch={handleSearch}
            isSearching={state.status === 'loading'}
          />
          <RecentSearchesList items={recentSearches} onSelect={handleSearch} />
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
                  <ProductCard key={item.id} {...item} searchQuery={query} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

// useSearchParams needs a Suspense boundary above it; without one the whole
// route opts out of static rendering.
export default function Home() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10" />}>
      <HomeSearch />
    </Suspense>
  );
}
