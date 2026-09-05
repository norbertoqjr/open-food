'use client';

import type { NutritionInfo, ProductSummary } from '@open-food/shared';
import Image from 'next/image';
import { use, useEffect, useState } from 'react';
import { NutritionPanel } from '@/components/nutrition-panel';
import { SubscribePrompt } from '@/components/subscribe-prompt';
import { Card } from '@/components/ui/card';
import { useLocale } from '@/lib/locale-context';
import {
  ApiError, getNutrition, getProduct, getSubscriptionStatus,
} from '@/lib/api';

type ProductState = { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; message: string }
  | { status: 'success'; product: ProductSummary };

type NutritionState = { status: 'checking' }
  | { status: 'locked' }
  | { status: 'unavailable' }
  | { status: 'unlocked'; nutrition: NutritionInfo };

// A client component, not an async Server Component: the selected locale
// is client-only (localStorage-backed) state, and this page must re-fetch
// localized product data when the user changes language while viewing it
// (build plan: "changing language updates ... available localized product
// content"), which a Server Component page can't react to on its own.
export default function ProductPage({ params }: PageProps<'/products/[id]'>) {
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
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-sm text-muted-foreground">…</p>
      </main>
    );
  }

  if (state.status === 'not-found') {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-sm text-muted-foreground">{t.noResultsFor(id)}</p>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <p role="alert" className="text-sm text-destructive">{state.message}</p>
      </main>
    );
  }

  const { product } = state;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-16">
      <Card className="flex w-full max-w-md flex-col gap-4 p-6">
        <div
          className={[
            'flex aspect-square items-center justify-center overflow-hidden',
            'rounded-lg bg-muted',
          ].join(' ')}
        >
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name ?? t.unnamedProduct}
              width={300}
              height={300}
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-sm text-muted-foreground">{t.noImageAvailable}</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">{product.name ?? t.unnamedProduct}</h1>
          <p className="text-sm text-muted-foreground">{product.brand ?? t.unknownBrand}</p>
        </div>

        {nutritionState.status === 'locked' ? <SubscribePrompt /> : null}
        {nutritionState.status === 'unavailable' ? (
          <p className="text-sm text-muted-foreground">{t.nutritionUnavailable}</p>
        ) : null}
        {nutritionState.status === 'unlocked' ? (
          <NutritionPanel nutrition={nutritionState.nutrition} />
        ) : null}
      </Card>
    </main>
  );
}
