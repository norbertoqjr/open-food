'use client';

import type { ProductDetail } from '@open-food/shared';
import { useLocale } from '@/lib/locale-context';

// Open Food Facts is crowdsourced, so most of these fields are missing on
// most products. Every row here is omitted rather than rendered empty, and
// the whole section disappears if nothing at all is known — an "Unknown"
// grid would be more chrome than information.
function TagRow({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <span
            key={value}
            className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground/80"
          >
            {value}
          </span>
        ))}
      </dd>
    </div>
  );
}

function TextRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;

  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export function ProductDetails({ product }: { product: ProductDetail }) {
  const { t } = useLocale();

  const hasFacts = Boolean(
    product.quantity || product.servingSize || product.novaGroup || product.ecoScore,
  );
  const hasTags = product.allergens.length > 0
    || product.labels.length > 0
    || product.categories.length > 0
    || product.countries.length > 0;

  return (
    <section className="flex flex-col gap-5 border-t border-border pt-5">
      <h3 className="text-sm font-semibold tracking-tight">{t.aboutTitle}</h3>

      {hasFacts || hasTags ? (
        <dl className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextRow label={t.quantityLabel} value={product.quantity} />
            <TextRow label={t.servingSizeLabel} value={product.servingSize} />
            <TextRow
              label={t.novaLabel}
              value={product.novaGroup ? t.novaDescription(product.novaGroup) : null}
            />
            <TextRow
              label={t.ecoScoreLabel}
              value={product.ecoScore ? product.ecoScore.toUpperCase() : null}
            />
            {/* Always known: it is the identifier the page was loaded by. */}
            <TextRow label={t.barcodeLabel} value={product.id} />
          </div>

          <TagRow label={t.allergensLabel} values={product.allergens} />
          <TagRow label={t.labelsLabel} values={product.labels} />
          <TagRow label={t.categoriesLabel} values={product.categories} />
          <TagRow label={t.countriesLabel} values={product.countries} />
        </dl>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <h4 className="text-xs font-medium text-muted-foreground">{t.ingredientsTitle}</h4>
        {product.ingredientsText ? (
          <p className="text-pretty text-sm leading-relaxed">{product.ingredientsText}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{t.ingredientsUnavailable}</p>
        )}
      </div>
    </section>
  );
}
