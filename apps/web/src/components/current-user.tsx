'use client';

import { User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from '@/lib/locale-context';
import { useSubscription } from '@/lib/subscription-context';
import { useCheckout } from '@/lib/use-checkout';

const BADGE = 'rounded-full px-2 py-1 text-xs font-semibold';

// The app has no sign-in, so this is not a session indicator: it makes the
// single demo user every request acts as, and the subscription that gates
// nutrition data, visible instead of implicit.
export function CurrentUser() {
  const { t, locale } = useLocale();
  const {
    user, active, loading, failed,
  } = useSubscription();
  const { start, state } = useCheckout();

  // An unreachable API already surfaces as an error on the page itself;
  // repeating it in the header would be noise.
  if (failed) return null;

  if (loading || !user) {
    return <Skeleton className="h-11 w-36 rounded-full" aria-hidden />;
  }

  const { cancelAtPeriodEnd, currentPeriodEnd } = user.subscription;
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
    <div className="flex items-center gap-2.5" title={`${t.signedInAs} ${user.id}`}>
      {/*
        An icon rather than initials: "demo-user" yields "DE", which sits next
        to the language picker and reads as a German locale badge.
      */}
      <span
        aria-hidden
        className={[
          'grid size-8 shrink-0 place-items-center rounded-full',
          active ? 'bg-brand text-on-brand' : 'bg-muted text-muted-foreground',
        ].join(' ')}
      >
        <User className="size-4" />
      </span>

      <span className="hidden flex-col leading-tight sm:flex">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <span className="sr-only">
            {t.signedInAs}
            {' '}
          </span>
          {t.demoUserName}
          {/*
            While unsubscribed the badge is the persistent way into checkout
            from any page; once subscribed it is only a status label, so it
            stops being interactive rather than becoming a no-op button.
            Either way it carries a text label, never colour alone.
          */}
          {active ? (
            <span className={`${BADGE} bg-brand-soft text-brand`}>{t.planSubscribed}</span>
          ) : (
            <button
              type="button"
              onClick={start}
              disabled={state === 'redirecting'}
              className={[
                BADGE,
                'cursor-pointer bg-muted text-muted-foreground outline-none',
                'transition-colors duration-[var(--duration-fast)] ease-[var(--ease)]',
                'hover:bg-primary hover:text-primary-foreground',
                'disabled:cursor-default disabled:opacity-60',
              ].join(' ')}
            >
              {state === 'redirecting' ? t.redirectingToCheckout : t.planFree}
            </button>
          )}
        </span>
        <span className="type-caption tabular-figures text-muted-foreground">{detail}</span>
      </span>
    </div>
  );
}
