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

  const isFirst = page <= 1;
  const isLast = page >= pageCount;

  return (
    <nav
      aria-label={t.paginationLabel}
      className="flex items-center justify-between gap-4 border-t border-border pt-5"
    >
      <Button
        type="button"
        variant="outline"
        onClick={() => onPageChange(page - 1)}
        disabled={isFirst}
      >
        <ChevronLeft className="size-4" aria-hidden />
        {t.previousPage}
      </Button>

      {/* aria-live so a screen reader hears the page change, which is
          otherwise silent when only the grid above swaps out. */}
      <p aria-live="polite" className="tabular-figures text-xs text-muted-foreground">
        {t.pageOf(formatNumber(page, locale), formatNumber(pageCount, locale))}
      </p>

      <Button
        type="button"
        variant="outline"
        onClick={() => onPageChange(page + 1)}
        disabled={isLast}
      >
        {t.nextPage}
        <ChevronRight className="size-4" aria-hidden />
      </Button>
    </nav>
  );
}
