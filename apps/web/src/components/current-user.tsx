'use client';

import { User } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from '@/lib/locale-context';
import { useSubscription } from '@/lib/subscription-context';
import { useCheckout } from '@/lib/use-checkout';

const BADGE = 'rounded-full px-2 py-1 text-xs font-semibold';

// Placeholder portraits from https://github.com/mhshariatipour1378/Avatars-Placeholder,
// whose id route serves a fixed set of faces numbered 0-100.
const AVATAR_COUNT = 101;

// Keyed on the user id rather than the display name: t.demoUserName is
// translated, so a name-derived face would change every time the language
// picker is touched, as if the account had changed with it.
function avatarUrl(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) % AVATAR_COUNT;
  }
  return `https://avatarapi.runflare.run/public/${hash}`;
}

// The app has no sign-in, so this is not a session indicator: it makes the
// single demo user every request acts as, and the subscription that gates
// nutrition data, visible instead of implicit.
export function CurrentUser() {
  const { t, locale } = useLocale();
  const {
    user, active, loading, failed,
  } = useSubscription();
  const { start, state } = useCheckout();
  // The portraits come from a third-party placeholder service, so treat it as
  // something that can be down: declared above the early returns because it is
  // a hook, and falls back to the icon this used to draw unconditionally.
  const [avatarFailed, setAvatarFailed] = useState(false);

  // An unreachable API already surfaces as an error on the page itself;
  // repeating it in the header would be noise.
  if (failed) return null;

  if (loading || !user) {
    // Sized to what actually resolves at each width -- a 9rem placeholder on a
    // phone reserved space for a name the narrow header no longer prints, and
    // the header visibly shrank when the fetch landed.
    return <Skeleton className="h-11 w-24 rounded-full md:w-36" aria-hidden />;
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
        A portrait rather than initials: "demo-user" yields "DE", which sits
        next to the language picker and reads as a German locale badge.

        Subscription state moves to a ring because a photo fills the circle
        the background colour used to carry. It stays a supplement either way
        -- the badge beside it says "Subscribed" or "Free" in words.
      */}
      <span
        aria-hidden
        className={[
          'grid size-8 shrink-0 place-items-center overflow-hidden rounded-full',
          active ? 'bg-brand text-on-brand ring-2 ring-brand' : 'bg-muted text-muted-foreground',
        ].join(' ')}
      >
        {avatarFailed ? (
          <User className="size-4" />
        ) : (
          <Image
            src={avatarUrl(user.id)}
            alt=""
            width={32}
            height={32}
            className="size-full object-cover"
            onError={() => setAvatarFailed(true)}
          />
        )}
      </span>

      {/*
        This block used to be `hidden sm:flex`, which contradicted the note
        below: the badge cannot be the persistent way into checkout if it is
        absent from every phone. The name and the renewal line still step back
        on a narrow header, but they step back to sr-only rather than out of
        the document, so the account announces itself in full at every width.

        They return at md rather than sm because sm was measured wrong: the
        full name, the renewal date and the restored wordmark together need
        about 736px in German, so between 640 and 736 the header silently
        wrapped to a second row -- the exact defect this pass set out to fix.
      */}
      <span className="flex flex-col leading-tight">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <span className="sr-only">
            {t.signedInAs}
            {' '}
          </span>
          <span className="sr-only md:not-sr-only">{t.demoUserName}</span>
          {/*
            While unsubscribed the badge is the persistent way into checkout
            from any page; once subscribed it is only a status label, so it
            stops being interactive rather than becoming a no-op button.
            Either way it carries a text label, never colour alone.

            Measured, not a device size: with German loaded -- the longest
            plan label this app ships, "Kostenlos" -- the four header clusters
            stop sharing one row below 368px, so the badge is what yields
            there. Little is lost, since checkout is also reached from the
            homepage banner and the product paywall, and the status still
            reads aloud through the sibling below. It is dropped rather than
            made sr-only because an sr-only <button> stays focusable, which
            would strand keyboard focus on a control nobody can see.
          */}
          {active ? (
            <span className={`${BADGE} hidden bg-brand-soft text-brand min-[368px]:inline`}>
              {t.planSubscribed}
            </span>
          ) : (
            <button
              type="button"
              onClick={start}
              disabled={state === 'redirecting'}
              className={[
                BADGE,
                'hidden cursor-pointer bg-muted text-muted-foreground outline-none',
                'transition-colors duration-[var(--duration-fast)] ease-[var(--ease)]',
                'hover:bg-primary hover:text-primary-foreground',
                'disabled:cursor-default disabled:opacity-60',
                'min-[368px]:inline',
              ].join(' ')}
            >
              {state === 'redirecting' ? t.redirectingToCheckout : t.planFree}
            </button>
          )}
          <span className="sr-only min-[368px]:hidden">
            {active ? t.planSubscribed : t.planFree}
          </span>
        </span>
        <span
          className={[
            'type-caption tabular-figures text-muted-foreground',
            'sr-only md:not-sr-only md:block',
          ].join(' ')}
        >
          {detail}
        </span>
      </span>
    </div>
  );
}
