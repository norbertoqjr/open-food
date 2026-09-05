'use client';

import { isSafeReturnPath } from '@open-food/shared';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { useLocale } from '@/lib/locale-context';

function SubscriptionCancelView() {
  const { t } = useLocale();

  // Abandoning checkout should land back where it started, not on the home
  // page. Validated rather than trusted: it arrives as a URL parameter.
  const nextParam = useSearchParams().get('next');
  const returnTo = nextParam && isSafeReturnPath(nextParam) ? nextParam : '/';

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-start gap-4 px-6 py-16">
      <h2 className="text-2xl font-semibold tracking-tight">{t.subscriptionCancelTitle}</h2>
      <p className="max-w-[55ch] text-sm text-muted-foreground">{t.subscriptionCancelMessage}</p>
      <Link href={returnTo} className={buttonVariants()}>
        {returnTo === '/' ? t.backToSearch : t.backToProduct}
      </Link>
    </main>
  );
}

// useSearchParams needs a Suspense boundary above it; without one the whole
// route opts out of static rendering.
export default function SubscriptionCancelPage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16" />}>
      <SubscriptionCancelView />
    </Suspense>
  );
}
