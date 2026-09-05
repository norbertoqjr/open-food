'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/locale-context';

export default function SubscriptionCancelPage() {
  const { t } = useLocale();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-start gap-4 px-6 py-16">
      <h2 className="text-2xl font-semibold tracking-tight">{t.subscriptionCancelTitle}</h2>
      <p className="max-w-[55ch] text-sm text-muted-foreground">{t.subscriptionCancelMessage}</p>
      <Button render={<Link href="/" />}>{t.backToSearch}</Button>
    </main>
  );
}
