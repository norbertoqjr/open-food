'use client';

import type { ProductSummary, RecentSearchItem } from '@open-food/shared';
import { useCallback, useEffect, useState } from 'react';
import { ProductCard } from '@/components/product-card';
import { RecentSearchesList } from '@/components/recent-searches-list';
import { SearchForm } from '@/components/search-form';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, getRecentSearches, searchProducts } from '@/lib/api';

type SearchState = | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; items: ProductSummary[]; total: number };

export default function Home() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({ status: 'idle' });
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);

  useEffect(() => {
    getRecentSearches()
      .then(setRecentSearches)
      .catch(() => setRecentSearches([]));
  }, []);

  const runSearch = useCallback(async (nextQuery: string) => {
    setQuery(nextQuery);
    setState({ status: 'loading' });

    try {
      const result = await searchProducts(nextQuery, 'en');
      setState({ status: 'success', items: result.items, total: result.total });
      setRecentSearches(await getRecentSearches());
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Search failed. Try again.';
      setState({ status: 'error', message });
    }
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Open Food</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Search packaged foods by name or brand.
        </p>
      </div>

      <SearchForm query={query} onSearch={runSearch} isSearching={state.status === 'loading'} />

      <RecentSearchesList items={recentSearches} onSelect={runSearch} />

      <div className="grid w-full max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {state.status === 'loading'
          ? Array.from({ length: 8 }, (_, index) => (

            <Skeleton key={index} className="aspect-square rounded-lg" />
          ))
          : null}
      </div>

      {state.status === 'error' ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      {state.status === 'success' && state.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No results for &ldquo;
          {query}
          &rdquo;.
        </p>
      ) : null}

      {state.status === 'success' && state.items.length > 0 ? (
        <div className="grid w-full max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {state.items.map((item) => (
            <ProductCard key={item.id} {...item} />
          ))}
        </div>
      ) : null}
    </main>
  );
}
