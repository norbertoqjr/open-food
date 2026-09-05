import type { RecentSearchItem } from '@open-food/shared';
import { Button } from '@/components/ui/button';

interface RecentSearchesListProps {
  items: RecentSearchItem[];
  onSelect: (query: string) => void;
}

export function RecentSearchesList({ items, onSelect }: RecentSearchesListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <p className="text-sm font-medium text-muted-foreground">Recent searches</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSelect(item.query)}
          >
            {item.query}
          </Button>
        ))}
      </div>
    </div>
  );
}
