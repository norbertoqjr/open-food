'use client';

import type { NutritionInfo } from '@open-food/shared';
import { formatNumber } from '@/lib/format-number';
import { useLocale } from '@/lib/locale-context';

interface NutritionPanelProps {
  nutrition: NutritionInfo;
}

interface Row {
  label: string;
  value: number | null;
  unit: string;
}

// Open Food Facts' own A–E scale, dark green through red. Written out rather
// than computed so Tailwind's scanner sees every class literally.
const NUTRI_SCORE_COLORS: Record<string, string> = {
  a: 'bg-emerald-600 text-white',
  b: 'bg-lime-500 text-white',
  c: 'bg-yellow-400 text-yellow-950',
  d: 'bg-orange-500 text-white',
  e: 'bg-red-600 text-white',
};

export function NutritionPanel({ nutrition }: NutritionPanelProps) {
  const { locale, t } = useLocale();

  const rows: Row[] = [
    { label: t.energyLabel, value: nutrition.energyKcal, unit: 'kcal' },
    { label: t.fatLabel, value: nutrition.fat, unit: 'g' },
    { label: t.saturatedFatLabel, value: nutrition.saturatedFat, unit: 'g' },
    { label: t.carbohydratesLabel, value: nutrition.carbohydrates, unit: 'g' },
    { label: t.sugarsLabel, value: nutrition.sugars, unit: 'g' },
    { label: t.fiberLabel, value: nutrition.fiber, unit: 'g' },
    { label: t.proteinsLabel, value: nutrition.proteins, unit: 'g' },
    { label: t.saltLabel, value: nutrition.salt, unit: 'g' },
  ];

  return (
    <section className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight">{t.nutritionTitle}</h2>

        {/* Derived from the nutriments below, so it belongs behind the same
            paywall rather than on the free product detail. */}
        {nutrition.nutriScore ? (
          <div className="flex items-center gap-2">
            <span className="type-caption text-muted-foreground">{t.nutriScoreLabel}</span>
            <span
              className={[
                'grid size-7 place-items-center rounded-md text-xs font-bold uppercase',
                NUTRI_SCORE_COLORS[nutrition.nutriScore] ?? 'bg-muted text-muted-foreground',
              ].join(' ')}
            >
              {nutrition.nutriScore}
            </span>
          </div>
        ) : null}
      </div>

      {/* A real table, not a stack of divs: these are label/value pairs with
          a shared basis, and a screen reader should be able to navigate them
          as such. The wrapper scrolls rather than letting the page overflow
          on a narrow viewport. */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="type-caption pb-3 text-left text-muted-foreground">
            {nutrition.basis ? t.nutritionBasis(nutrition.basis) : t.nutritionTitle}
          </caption>
          <thead>
            <tr className="bg-muted text-left">
              <th scope="col" className="rounded-l-lg px-4 py-3 font-medium">
                {t.nutrientColumn}
              </th>
              <th scope="col" className="rounded-r-lg px-4 py-3 text-right font-medium">
                {t.amountColumn}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-border last:border-0">
                <th scope="row" className="px-4 py-3 text-left font-normal text-muted-foreground">
                  {row.label}
                </th>
                <td
                  className={[
                    'tabular-figures px-4 py-3 text-right',
                    // Missing data reads as missing. Never rendered as 0,
                    // which would be a claim the source never made.
                    row.value === null ? 'text-muted-foreground' : 'font-semibold',
                  ].join(' ')}
                >
                  {row.value === null
                    ? t.notAvailable
                    : `${formatNumber(row.value, locale)} ${row.unit}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
