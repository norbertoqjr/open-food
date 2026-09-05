'use client';

import type { ProductSummary } from '@open-food/shared';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';

export function ProductCard({
  id, name, brand, imageUrl,
}: ProductSummary) {
  const { t } = useLocale();

  return (
    <Link
      href={`/products/${encodeURIComponent(id)}`}
      className={[
        'group flex flex-col gap-2.5 rounded-xl outline-none',
        'focus-visible:ring-3 focus-visible:ring-ring/50',
      ].join(' ')}
    >
      <div
        className={[
          'flex aspect-square items-center justify-center overflow-hidden rounded-xl',
          'border border-border bg-muted transition-colors group-hover:border-foreground/20',
        ].join(' ')}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name ?? t.unnamedProduct}
            width={280}
            height={280}
            className={[
              'h-full w-full object-contain transition-transform duration-300',
              'ease-out group-hover:scale-[1.03]',
            ].join(' ')}
          />
        ) : (
          <span className="text-xs text-muted-foreground">{t.noImage}</span>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="line-clamp-2 text-sm font-medium leading-snug">
          {name ?? t.unnamedProduct}
        </p>
        <p className="line-clamp-1 text-xs text-muted-foreground">{brand ?? t.unknownBrand}</p>
      </div>
    </Link>
  );
}
