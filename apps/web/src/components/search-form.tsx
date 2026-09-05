'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { searchFormSchema, type SearchFormValues } from '@open-food/shared';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/lib/locale-context';

interface SearchFormProps {
  query: string;
  onSearch: (query: string) => void;
  isSearching: boolean;
}

// react-hook-form directly, not shadcn's Form wrapper: the Base UI registry
// this project initialized with does not ship a working Form component (see
// the shadcn-nextjs skill). A single text field needs no Controller either.
export function SearchForm({ query, onSearch, isSearching }: SearchFormProps) {
  const { t } = useLocale();
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    control,
    formState: { errors },
  } = useForm<SearchFormValues>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: { query },
  });

  useEffect(() => {
    reset({ query });
  }, [query, reset]);

  // useWatch rather than watch(): the latter returns a new function each
  // render and cannot be memoized safely.
  const hasText = Boolean(useWatch({ control, name: 'query' }));

  // Clears the results too, not just the field: leaving results for a query
  // the box no longer shows would be confusing. onSearch('') drops the ?q=
  // parameter, which returns the page to its idle state.
  const handleClear = () => {
    reset({ query: '' });
    onSearch('');
    // onSearch rewrites the URL, and the resulting re-render drops focus, so
    // it is restored on the next frame rather than in this one. Someone who
    // clears the box almost always wants to type again.
    requestAnimationFrame(() => setFocus('query'));
  };

  return (
    <form
      onSubmit={handleSubmit((values) => onSearch(values.query))}
      className="flex w-full max-w-xl flex-col gap-2"
      noValidate
    >
      <Label htmlFor="search-query" className="text-xs font-medium text-muted-foreground">
        {t.searchLabel}
      </Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id="search-query"
            placeholder={t.searchPlaceholder}
            autoComplete="off"
            aria-invalid={Boolean(errors.query)}
            className="h-10 w-full rounded-lg pr-9"
            {...register('query')}
          />
          {hasText ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label={t.clearSearch}
              className={[
                'absolute inset-y-0 right-0 grid w-9 cursor-pointer place-items-center',
                'rounded-r-lg text-muted-foreground outline-none transition-colors',
                'hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
              ].join(' ')}
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
        <Button type="submit" size="lg" disabled={isSearching} className="h-10 px-5">
          {isSearching ? t.searchingButton : t.searchButton}
        </Button>
      </div>
      {/* The shared Zod schema's own message is API-facing English only;
          the visible error here is always the current locale's translation,
          shown whenever validation fails regardless of that message's text. */}
      {errors.query ? (
        <p role="alert" className="text-sm text-destructive">
          {t.searchRequiredError}
        </p>
      ) : null}
    </form>
  );
}
