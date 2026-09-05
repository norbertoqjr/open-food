import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { ApiError, getProduct } from '@/lib/api';

export default async function ProductPage({ params }: PageProps<'/products/[id]'>) {
  const { id } = await params;

  let product;
  try {
    product = await getProduct(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-16">
      <Card className="flex w-full max-w-md flex-col gap-4 p-6">
        <div
          className={[
            'flex aspect-square items-center justify-center overflow-hidden',
            'rounded-lg bg-muted',
          ].join(' ')}
        >
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name ?? 'Product image'}
              width={300}
              height={300}
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-sm text-muted-foreground">No image available</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">{product.name ?? 'Unnamed product'}</h1>
          <p className="text-sm text-muted-foreground">{product.brand ?? 'Unknown brand'}</p>
        </div>
      </Card>
    </main>
  );
}
