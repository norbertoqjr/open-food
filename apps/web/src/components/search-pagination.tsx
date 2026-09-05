'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/format-number';
import { useLocale } from '@/lib/locale-context';

interface SearchPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function SearchPagination({
  page, pageSize, total, onPageChange,
}: SearchPaginationProps) {
  const { locale, t } = useLocale();
  const pageCount = Math.ceil(total / pageSize);

  // Nothing to page through: a single page needs no controls.
  if (pageCount <= 1) return null;

  return (
    <nav aria-label={t.paginationLabel} className="mt-10 flex items-center justify-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft className="size-4" aria-hidden />
        {t.previousPage}
      </Button>

      {/* aria-live so a screen reader hears the page change, which is
          otherwise silent when only the grid above swaps out. */}
      <p aria-live="polite" className="type-caption tabular-figures px-2 text-muted-foreground">
        {t.pageOf(formatNumber(page, locale), formatNumber(pageCount, locale))}
      </p>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
      >
        {t.nextPage}
        <ChevronRight className="size-4" aria-hidden />
      </Button>
    </nav>
  );
}
