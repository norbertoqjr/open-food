import type { ProductSummary } from '@open-food/shared';
import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';

export function ProductCard({
  id, name, brand, imageUrl,
}: ProductSummary) {
  return (
    <Link href={`/products/${encodeURIComponent(id)}`} className="block">
      <Card className="flex h-full flex-col gap-3 p-4 transition-colors hover:bg-muted/50">
        <div
          className={[
            'flex aspect-square items-center justify-center overflow-hidden',
            'rounded-lg bg-muted',
          ].join(' ')}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name ?? 'Product image'}
              width={200}
              height={200}
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-xs text-muted-foreground">No image</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <p className="line-clamp-2 text-sm font-medium">{name ?? 'Unnamed product'}</p>
          <p className="text-xs text-muted-foreground">{brand ?? 'Unknown brand'}</p>
        </div>
      </Card>
    </Link>
  );
}
