'use client';

import type { ProductSummary } from '@open-food/shared';
import { ImageOff } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { buildSearchQuery } from '@/lib/search-url';

interface ProductCardProps extends ProductSummary {
  // Carried into the product URL so its back link can return to this exact
  // search -- and the exact page of it -- rather than dumping the user on an
  // empty home page or back at the first page. Empty string when the card is
  // not shown as part of a search result.
  searchQuery: string;
  searchPage: number;
}

export function ProductCard({
  id, name, brand, imageUrl, searchQuery, searchPage,
}: ProductCardProps) {
  const { t } = useLocale();
  const href = `/products/${encodeURIComponent(id)}${
    searchQuery ? `?${buildSearchQuery(searchQuery, searchPage)}` : ''
  }`;

  return (
    // One link wrapping the whole card: no nested interactive elements, so
    // there is a single tab stop and the entire tile is the target. The
    // "view product" affordance is text inside it, not a second control.
    <Link
      href={href}
      className="group/card flex flex-col gap-3 rounded-2xl outline-none"
    >
      <div
        className={[
          'flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl',
          'bg-muted p-6',
          'transition-colors duration-[var(--duration-normal)] ease-[var(--ease)]',
          'group-hover/card:bg-surface-hover',
        ].join(' ')}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name ?? t.unnamedProduct}
            width={320}
            height={240}
            loading="lazy"
            // contain, never cover: cropping a package hides exactly the
            // label a shopper is trying to read.
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageOff className="size-6" aria-hidden />
            <span className="type-caption">{t.noImage}</span>
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <p className="line-clamp-2 text-base font-semibold leading-snug">
          {name ?? t.unnamedProduct}
        </p>
        <p className="type-caption line-clamp-1 text-muted-foreground">
          {brand ?? t.unknownBrand}
        </p>
        {/* Underlined on hover rather than appearing on hover: the spec
            requires the affordance to be readable without pointing at it. */}
        <span
          className={[
            'type-caption mt-1 font-medium text-foreground underline-offset-4',
            'group-hover/card:underline',
          ].join(' ')}
        >
          {t.viewProduct}
        </span>
      </div>
    </Link>
  );
}
