'use client';

import type { CurrentUserResponse } from '@open-food/shared';
import { User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentUser } from '@/lib/api';
import { useLocale } from '@/lib/locale-context';

// The app has no sign-in, so this is not a session indicator: it makes the
// single demo user every request acts as, and the subscription that gates
// nutrition data, visible instead of implicit.
export function CurrentUser() {
  const { t, locale } = useLocale();
  const [user, setUser] = useState<CurrentUserResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then((next) => {
        if (!cancelled) setUser(next);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // An unreachable API already surfaces as an error on the page itself;
  // repeating it in the header would be noise.
  if (failed) return null;

  if (!user) {
    return <Skeleton className="h-8 w-32 rounded-full" aria-hidden />;
  }

  const { active, cancelAtPeriodEnd, currentPeriodEnd } = user.subscription;
  const formatDate = (iso: string) => new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
  }).format(new Date(iso));

  // Prefer the period end (the date the user actually cares about) and fall
  // back to the account age when there is no subscription to describe.
  let detail = t.memberSince(formatDate(user.memberSince));
  if (active && currentPeriodEnd) {
    detail = cancelAtPeriodEnd
      ? t.planEndsOn(formatDate(currentPeriodEnd))
      : t.planRenewsOn(formatDate(currentPeriodEnd));
  }

  return (
    <div
      className="flex items-center gap-2.5"
      title={`${t.signedInAs} ${user.id}`}
    >
      {/*
        An icon rather than initials: "demo-user" yields "DE", which sits next
        to the language picker and reads as a German locale badge.
      */}
      <span
        aria-hidden
        className={[
          'grid size-8 shrink-0 place-items-center rounded-full',
          active
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground',
        ].join(' ')}
      >
        <User className="size-4" />
      </span>

      <span className="hidden flex-col leading-tight sm:flex">
        <span className="text-xs font-medium">
          <span className="sr-only">
            {t.signedInAs}
            {' '}
          </span>
          {t.demoUserName}
          <span
            className={[
              'ml-1.5 rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold',
              active
                ? 'bg-primary/12 text-primary'
                : 'bg-muted text-muted-foreground',
            ].join(' ')}
          >
            {active ? t.planSubscribed : t.planFree}
          </span>
        </span>
        <span className="tabular-figures text-[0.7rem] text-muted-foreground">
          {detail}
        </span>
      </span>
    </div>
  );
}
