'use client';

import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/locale-context';
import { useCheckout } from '@/lib/use-checkout';

// The paywall as met on a product page. A soft accent panel rather than a
// bordered card: it is an offer, not an error, and it sits where the
// nutrition table would otherwise be.
export function SubscribePrompt() {
  const { t } = useLocale();
  const { start, state } = useCheckout();

  return (
    <section className="flex flex-col items-start gap-4 rounded-2xl bg-brand-soft p-6">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-on-brand"
        >
          <Lock className="size-4" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold tracking-tight">{t.nutritionLockedTitle}</h2>
          <p className="max-w-[46ch] text-sm text-muted-foreground">{t.nutritionLockedBody}</p>
        </div>
      </div>

      <Button type="button" onClick={start} disabled={state === 'redirecting'}>
        {state === 'redirecting' ? t.redirectingToCheckout : t.continueToCheckout}
      </Button>

      {state === 'error' || state === 'not-configured' ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state === 'not-configured' ? t.billingNotConfiguredError : t.checkoutFailedError}
        </p>
      ) : null}
    </section>
  );
}
