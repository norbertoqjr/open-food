'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getSubscriptionStatus } from '@/lib/api';
import { useLocale } from '@/lib/locale-context';

const POLL_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 2000;

// The Checkout success redirect itself grants nothing — only a verified
// webhook does (see build plan, section 4). This page polls the real
// entitlement a few times rather than assuming success from the redirect,
// since webhook processing can still be in flight when the browser lands
// here.
export default function SubscriptionSuccessPage() {
  const { t } = useLocale();
  const [confirmed, setConfirmed] = useState<boolean | null>(null);

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
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-xl font-semibold">{t.subscriptionSuccessTitle}</h1>
      <p className="text-sm text-muted-foreground">
        {confirmed === null && t.subscriptionSuccessConfirming}
        {confirmed === true && t.subscriptionSuccessConfirmed}
        {confirmed === false && t.subscriptionSuccessPending}
      </p>
      <Button render={<Link href="/" />}>{t.backToSearch}</Button>
    </main>
  );
}
