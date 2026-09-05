import type { Metadata } from 'next';
import { getProduct } from '@/lib/api';

// A server layout wrapping the client page: the page itself must stay a
// client component (locale is localStorage-backed), but metadata and
// structured data have to be rendered on the server to be seen by a crawler
// that does not run scripts. This is the only place that can do both.

async function loadProduct(id: string) {
  try {
    // English here, not the visitor's locale: the selected language never
    // reaches the server, and a crawler has no stored preference either.
    return await getProduct(id, 'en');
  } catch {
    // A missing or unreachable product falls back to generic metadata
    // rather than failing the render.
    return null;
  }
}

export async function generateMetadata(
  { params }: LayoutProps<'/products/[id]'>,
): Promise<Metadata> {
  const { id } = await params;
  const product = await loadProduct(id);

  if (!product?.name) {
    return { title: 'Product', robots: { index: false } };
  }

  const title = product.brand ? `${product.name} — ${product.brand}` : product.name;
  const description = product.ingredientsText
    ? `Ingredients, allergens and nutrition for ${title}. ${product.ingredientsText}`.slice(0, 300)
    : `Ingredients, allergens and nutrition information for ${title}.`;
  const canonical = `/products/${encodeURIComponent(id)}`;

  return {
    title: product.name,
    description,
    // Without this every product would inherit the search page's canonical
    // and the whole catalogue would collapse into one indexed URL.
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title,
      description,
      url: canonical,
      images: product.imageUrl ? [{ url: product.imageUrl, alt: title }] : undefined,
    },
    twitter: {
      card: product.imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
    },
  };
}

export default async function ProductLayout({ children, params }: LayoutProps<'/products/[id]'>) {
  const { id } = await params;
  const product = await loadProduct(id);

  // Product schema, so an answer engine can quote the ingredients and
  // allergens rather than guess at them. Deliberately carries no offers,
  // price, rating or review: this app sells nothing here and invents
  // nothing. Nutrition is absent too -- it is subscriber-only, and
  // publishing it in markup would hand away what the paywall protects.
  const jsonLd = product?.name
    ? {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
      ...(product.imageUrl ? { image: product.imageUrl } : {}),
      ...(product.genericName ? { description: product.genericName } : {}),
      // gtin13 only when the barcode really is 13 digits; EAN-8 and UPC
      // codes are not gtin13 and mislabelling them is worse than omitting.
      ...(/^\d{13}$/.test(product.id) ? { gtin13: product.id } : {}),
      ...(product.categories.length > 0 ? { category: product.categories[0] } : {}),
    }
    : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      {children}
    </>
  );
}
