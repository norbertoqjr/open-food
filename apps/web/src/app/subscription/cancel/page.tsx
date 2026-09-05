'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/locale-context';

export default function SubscriptionCancelPage() {
  const { t } = useLocale();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-xl font-semibold">{t.subscriptionCancelTitle}</h1>
      <p className="text-sm text-muted-foreground">{t.subscriptionCancelMessage}</p>
      <Button render={<Link href="/" />}>{t.backToSearch}</Button>
    </main>
  );
}
