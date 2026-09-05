'use client';

import type { CurrentUserResponse } from '@open-food/shared';
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { getCurrentUser } from './api';

interface SubscriptionContextValue {
  user: CurrentUserResponse | null;
  /** True only for a confirmed active subscription, never while loading. */
  active: boolean;
  loading: boolean;
  /** The API is unreachable; consumers render nothing rather than guessing. */
  failed: boolean;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

// One /me fetch shared by the header chip and the homepage prompt, which
// would otherwise each request it on every page.
//
// This is presentation state only. The product page deliberately re-checks
// entitlement itself before requesting nutrition, and the server enforces it
// regardless (SubscriptionGuard returns 403), so nothing here grants access.
export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setUser(await getCurrentUser());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // refresh() sets state before awaiting, which the rule flags; that is
    // exactly the intent here (show the skeleton while the request runs).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().catch(() => {
      // refresh already records the failure in state.
    });
  }, [refresh]);

  const value = useMemo<SubscriptionContextValue>(() => ({
    user,
    active: user?.subscription.active ?? false,
    loading,
    failed,
    refresh,
  }), [user, loading, failed, refresh]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);

  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }

  return context;
}
