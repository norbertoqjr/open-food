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
    <div className="flex w-full flex-col gap-3 border-t border-border pt-5">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-semibold tracking-tight">{t.nutritionTitle}</h3>
        {nutrition.basis ? (
          <span className="text-xs text-muted-foreground">{t.nutritionBasis(nutrition.basis)}</span>
        ) : null}
      </div>
      <dl className="flex flex-col divide-y divide-border text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-6 py-2">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd
              className={[
                'tabular-figures shrink-0 text-right',
                row.value === null ? 'text-muted-foreground' : 'font-medium',
              ].join(' ')}
            >
              {row.value === null ? '—' : `${formatNumber(row.value, locale)} ${row.unit}`}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
