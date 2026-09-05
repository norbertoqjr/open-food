'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiError, createCheckoutSession } from '@/lib/api';
import { useLocale } from '@/lib/locale-context';

export function SubscribePrompt() {
  const { t } = useLocale();
  const [state, setState] = useState<'idle' | 'redirecting' | 'error'>('idle');

  const handleSubscribe = useCallback(async () => {
    setState('redirecting');
    try {
      const { url } = await createCheckoutSession();
      window.location.href = url;
    } catch (error) {
      setState('error');
      const detail = error instanceof ApiError ? error.message : error;
      // The UI shows a translated message; this is for debugging only.
      // eslint-disable-next-line no-console
      console.error('Checkout session creation failed', detail);
    }
  }, []);

  return (
    <div
      className={[
        'flex flex-col items-center gap-3 rounded-lg border',
        'border-border p-4 text-center',
      ].join(' ')}
    >
      <p className="text-sm text-muted-foreground">{t.subscribePrompt}</p>
      <Button type="button" onClick={handleSubscribe} disabled={state === 'redirecting'}>
        {state === 'redirecting' ? t.redirectingToCheckout : t.subscribeButton}
      </Button>
      {state === 'error' ? (
        <p role="alert" className="text-sm text-destructive">{t.checkoutFailedError}</p>
      ) : null}
    </div>
  );
}
