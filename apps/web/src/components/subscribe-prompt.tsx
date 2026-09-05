'use client';

import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/locale-context';
import { useCheckout } from '@/lib/use-checkout';

export function SubscribePrompt() {
  const { t } = useLocale();
  const { start, state } = useCheckout();

  return (
    <div
      className={[
        'flex flex-col items-start gap-3 rounded-xl border border-border',
        'bg-muted/40 p-5',
      ].join(' ')}
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold tracking-tight">{t.nutritionTitle}</h3>
        <p className="max-w-[46ch] text-sm text-muted-foreground">{t.subscribePrompt}</p>
      </div>
      <Button type="button" onClick={start} disabled={state === 'redirecting'}>
        {state === 'redirecting' ? t.redirectingToCheckout : t.subscribeButton}
      </Button>
      {state === 'error' || state === 'not-configured' ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state === 'not-configured' ? t.billingNotConfiguredError : t.checkoutFailedError}
        </p>
      ) : null}
    </div>
  );
}
