'use client';

import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/locale-context';
import { useSubscription } from '@/lib/subscription-context';
import { useCheckout } from '@/lib/use-checkout';

// The homepage entry point into checkout. Without it the only way to
// subscribe is to open a product and wait for its paywall to resolve.
export function SubscribeBanner() {
  const { t } = useLocale();
  const { active, loading, failed } = useSubscription();
  const { start, state } = useCheckout();

  // Nothing to offer a subscriber, and rendering during the initial fetch
  // would flash a subscribe prompt at someone who already pays.
  if (loading || failed || active) return null;

  return (
    <div
      className={[
        'flex flex-col gap-4 rounded-2xl bg-brand-soft px-5 py-4',
        'sm:flex-row sm:items-center sm:justify-between sm:gap-6',
      ].join(' ')}
    >
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold tracking-tight">{t.subscribeGlobalTitle}</p>
        <p className="text-sm text-muted-foreground">{t.subscribeGlobalPrompt}</p>
      </div>
      <div className="flex flex-col items-start gap-2 sm:shrink-0 sm:items-end">
        <Button type="button" size="sm" onClick={start} disabled={state === 'redirecting'}>
          {state === 'redirecting' ? t.redirectingToCheckout : t.subscribeButton}
        </Button>
        {state === 'error' || state === 'not-configured' ? (
          <p role="alert" className="type-caption font-medium text-destructive">
            {state === 'not-configured' ? t.billingNotConfiguredError : t.checkoutFailedError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
