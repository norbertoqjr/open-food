'use client';

import { BILLING_NOT_CONFIGURED } from '@open-food/shared';
import { useCallback, useState } from 'react';
import { ApiError, createCheckoutSession } from './api';

export type CheckoutState = 'idle' | 'redirecting' | 'error' | 'not-configured';

interface UseCheckout {
  start: () => Promise<void>;
  state: CheckoutState;
}

// Shared by every entry point into checkout, so they cannot drift on error
// handling or on which failures are worth retrying.
export function useCheckout(): UseCheckout {
  const [state, setState] = useState<CheckoutState>('idle');

  const start = useCallback(async () => {
    setState('redirecting');
    try {
      // Where to come back to after paying: the current page, query string
      // included, so an in-progress search survives the round trip.
      const returnTo = `${window.location.pathname}${window.location.search}`;
      const { url } = await createCheckoutSession(returnTo);
      window.location.href = url;
    } catch (error) {
      // An unconfigured server will never succeed on retry, so it gets its
      // own message rather than the generic "try again".
      const notConfigured = error instanceof ApiError && error.code === BILLING_NOT_CONFIGURED;
      setState(notConfigured ? 'not-configured' : 'error');
      const detail = error instanceof ApiError ? error.message : error;
      // The UI shows a translated message; this is for debugging only.
      // eslint-disable-next-line no-console
      console.error('Checkout session creation failed', detail);
    }
  }, []);

  return { start, state };
}
