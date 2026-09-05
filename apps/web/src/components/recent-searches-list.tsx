'use client';

import type { RecentSearchItem } from '@open-food/shared';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/locale-context';

const MAX_VISIBLE = 6;

interface RecentSearchesListProps {
  items: RecentSearchItem[];
  onSelect: (query: string) => void;
}

// Stored history is per query *and locale*, so running the same search in two
// languages -- which the language selector does on every switch -- recorded
// two rows. Displaying them raw showed the same word half a dozen times.
// The list is deduplicated for display only; the history itself stays intact.
function distinctQueries(items: RecentSearchItem[]): RecentSearchItem[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = item.query.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function RecentSearchesList({ items, onSelect }: RecentSearchesListProps) {
  const { t } = useLocale();
  const visible = distinctQueries(items).slice(0, MAX_VISIBLE);

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="type-caption font-medium text-muted-foreground">{t.recentSearchesLabel}</p>
      {/* Wraps rather than scrolls: a horizontal scroller would hide terms
          on exactly the narrow viewports where the list matters most. */}
      <ul className="flex flex-wrap gap-2">
        {visible.map((item) => (
          <li key={item.id}>
            <Button type="button" variant="outline" size="xs" onClick={() => onSelect(item.query)}>
              {item.query}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
