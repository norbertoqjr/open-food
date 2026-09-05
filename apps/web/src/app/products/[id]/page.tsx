'use client';

import type { NutritionInfo, ProductDetail } from '@open-food/shared';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Suspense, use, useEffect, useState,
} from 'react';
import { NutritionPanel } from '@/components/nutrition-panel';
import { ProductDetails } from '@/components/product-details';
import { SubscribePrompt } from '@/components/subscribe-prompt';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from '@/lib/locale-context';
import { buildSearchHref, parsePage } from '@/lib/search-url';
import {
  ApiError, getNutrition, getProduct, getSubscriptionStatus,
} from '@/lib/api';

type ProductState = { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; message: string }
  | { status: 'success'; product: ProductDetail };

type NutritionState = { status: 'checking' }
  | { status: 'locked' }
  | { status: 'unavailable' }
  | { status: 'unlocked'; nutrition: NutritionInfo };

// Same max width and gutters as the search route, so the two never drift.
const SHELL = 'mx-auto w-full max-w-[1440px] flex-1 px-5 py-10 sm:px-8 sm:py-14 lg:px-16';

// Returns to the search the user arrived from -- the same query and the same
// page of results, both carried in the URL -- or to a bare home page when
// they landed on this product directly.
function BackToSearchLink({ label }: { label: string }) {
  const params = useSearchParams();
  const searchQuery = params.get('q')?.trim() ?? '';

  return (
    <Link
      href={buildSearchHref(searchQuery, parsePage(params.get('page')))}
      className={[
        'inline-flex min-h-11 items-center gap-2 rounded-full text-sm text-muted-foreground',
        'transition-colors duration-[var(--duration-fast)] ease-[var(--ease)]',
        'hover:text-foreground',
      ].join(' ')}
    >
      <ArrowLeft className="size-3.5" aria-hidden />
      {label}
    </Link>
  );
}

// A client component, not an async Server Component: the selected locale
// is client-only (localStorage-backed) state, and this page must re-fetch
// localized product data when the user changes language while viewing it
// (build plan: "changing language updates ... available localized product
// content"), which a Server Component page can't react to on its own.
function ProductView({ params }: PageProps<'/products/[id]'>) {
  const { id } = use(params);
  const { locale, t } = useLocale();
  const [state, setState] = useState<ProductState>({ status: 'loading' });
  const [nutritionState, setNutritionState] = useState<NutritionState>({ status: 'checking' });

  // A fresh fetch per id/locale change, resetting to a loading state before
  // it starts: the standard vanilla-React pattern for this without pulling
  // in a data-fetching library for one page.
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: 'loading' });

    getProduct(id, locale)
      .then((product) => {
        if (!cancelled) {
          setState({ status: 'success', product });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && error.status === 404) {
          setState({ status: 'not-found' });
        } else {
          const message = error instanceof ApiError ? error.message : t.searchFailedError;
          setState({ status: 'error', message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, locale, t.searchFailedError]);

  // Entitlement, then nutrition, are checked independently of the product
  // fetch above and on every request — never assumed from a prior page
  // visit or a successful checkout redirect (see build plan, section 4).
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNutritionState({ status: 'checking' });

    getSubscriptionStatus()
      .then((subscription) => {
        if (cancelled) {
          return Promise.resolve();
        }
        if (!subscription.active) {
          setNutritionState({ status: 'locked' });
          return Promise.resolve();
        }
        return getNutrition(id)
          .then((nutrition) => {
            if (!cancelled) {
              setNutritionState({ status: 'unlocked', nutrition });
            }
          })
          .catch(() => {
            if (!cancelled) {
              setNutritionState({ status: 'unavailable' });
            }
          });
      })
      .catch(() => {
        if (!cancelled) {
          setNutritionState({ status: 'locked' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === 'loading') {
    return (
      <main className={SHELL}>
        <BackToSearchLink label={t.backToSearch} />
        <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <Skeleton className="aspect-[4/3] rounded-2xl" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-7 w-3/5 rounded-sm" />
            <Skeleton className="h-4 w-2/5 rounded-sm" />
          </div>
        </div>
      </main>
    );
  }

  if (state.status === 'not-found') {
    return (
      <main className={SHELL}>
        <BackToSearchLink label={t.backToSearch} />
        <p
          className="mt-8 rounded-2xl bg-muted px-5 py-4 text-sm text-muted-foreground"
        >
          {t.noResultsFor(id)}
        </p>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className={SHELL}>
        <BackToSearchLink label={t.backToSearch} />
        <p
          role="alert"
          className={[
            'mt-8 rounded-2xl bg-destructive-soft px-5 py-4',
            'text-sm font-medium text-destructive',
          ].join(' ')}
        >
          {state.message}
        </p>
      </main>
    );
  }

  const { product } = state;

  return (
    <main className={SHELL}>
      <BackToSearchLink label={t.backToSearch} />
      <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] md:items-start">
        <div
          className={[
            'flex aspect-[4/3] items-center justify-center overflow-hidden',
            'rounded-2xl bg-muted p-8',
          ].join(' ')}
        >
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name ?? t.unnamedProduct}
              width={480}
              height={480}
              className="h-full w-full object-contain"
              priority
            />
          ) : (
            <span className="text-sm text-muted-foreground">{t.noImageAvailable}</span>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="type-section text-pretty">
              {product.name ?? t.unnamedProduct}
            </h1>
            <p className="text-sm text-muted-foreground">{product.brand ?? t.unknownBrand}</p>
            {product.genericName ? (
              <p className="text-sm text-muted-foreground">{product.genericName}</p>
            ) : null}
          </div>

          <ProductDetails product={product} />

          {nutritionState.status === 'locked' ? <SubscribePrompt /> : null}
          {nutritionState.status === 'unavailable' ? (
            <p className="rounded-2xl bg-muted px-5 py-4 text-sm text-muted-foreground">
              {t.nutritionUnavailable}
            </p>
          ) : null}
          {nutritionState.status === 'unlocked' ? (
            <NutritionPanel nutrition={nutritionState.nutrition} />
          ) : null}
        </div>
      </div>
    </main>
  );
}

// useSearchParams (in BackToSearchLink) needs a Suspense boundary above it;
// without one the whole route opts out of static rendering.
export default function ProductPage(props: PageProps<'/products/[id]'>) {
  return (
    <Suspense fallback={<main className={SHELL} />}>
      <ProductView {...props} />
    </Suspense>
  );
}
