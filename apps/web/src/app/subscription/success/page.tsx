'use client';

import { isSafeReturnPath } from '@open-food/shared';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { getSubscriptionStatus } from '@/lib/api';
import { useLocale } from '@/lib/locale-context';
import { useSubscription } from '@/lib/subscription-context';

const POLL_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 2000;

// The Checkout success redirect itself grants nothing — only a verified
// webhook does (see build plan, section 4). This page polls the real
// entitlement a few times rather than assuming success from the redirect,
// since webhook processing can still be in flight when the browser lands
// here.
function SubscriptionSuccessView() {
  const { t } = useLocale();
  const { refresh } = useSubscription();
  const [confirmed, setConfirmed] = useState<boolean | null>(null);

  // Where the user started checkout, round-tripped through Stripe. Validated
  // rather than trusted: it arrives as a URL parameter, so it could name
  // another origin.
  const nextParam = useSearchParams().get('next');
  const returnTo = nextParam && isSafeReturnPath(nextParam) ? nextParam : '/';

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;

    const poll = () => {
      getSubscriptionStatus()
        .then((status) => {
          if (cancelled) {
            return;
          }
          attempt += 1;
          if (status.active) {
            setConfirmed(true);
            // The header still holds the pre-checkout status; without this
            // it would keep offering "Free" to someone who just paid.
            refresh().catch(() => {
              // The button below still works; a stale header badge is
              // cosmetic and self-corrects on the next page load.
            });
          } else if (attempt < POLL_ATTEMPTS) {
            setTimeout(poll, POLL_INTERVAL_MS);
          } else {
            setConfirmed(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setConfirmed(false);
          }
        });
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-start gap-4 px-6 py-16">
      <h2 className="text-2xl font-semibold tracking-tight">{t.subscriptionSuccessTitle}</h2>
      <p className="max-w-[55ch] text-sm text-muted-foreground">
        {confirmed === null && t.subscriptionSuccessConfirming}
        {confirmed === true && t.subscriptionSuccessConfirmed}
        {confirmed === false && t.subscriptionSuccessPending}
      </p>
      <Link href={returnTo} className={buttonVariants()}>
        {returnTo === '/' ? t.backToSearch : t.backToProduct}
      </Link>
    </main>
  );
}

// useSearchParams needs a Suspense boundary above it; without one the whole
// route opts out of static rendering.
export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16" />}>
      <SubscriptionSuccessView />
    </Suspense>
  );
}
