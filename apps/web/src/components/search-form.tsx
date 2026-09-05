'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { searchFormSchema, type SearchFormValues } from '@open-food/shared';
import { Search, X } from 'lucide-react';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
//
// The field is a pill on a tinted surface with a circular submit, per
// docs/design.json -- the one control that spends the brand colour, so the
// way into the app is unambiguous.
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
      className="flex w-full max-w-2xl flex-col gap-2"
      noValidate
    >
      <Label htmlFor="search-query" className="type-caption font-medium text-muted-foreground">
        {t.searchLabel}
      </Label>

      <div
        className={[
          'flex min-h-[3.75rem] items-center gap-2 rounded-full border border-border',
          'bg-muted py-2 pr-2 pl-6',
          'transition-colors duration-[var(--duration-normal)] ease-[var(--ease)]',
          'focus-within:border-brand focus-within:bg-background',
          errors.query ? 'border-destructive' : '',
        ].join(' ')}
      >
        <input
          id="search-query"
          type="text"
          placeholder={t.searchPlaceholder}
          autoComplete="off"
          aria-invalid={Boolean(errors.query)}
          aria-describedby={errors.query ? 'search-query-error' : undefined}
          className={[
            'min-w-0 flex-1 bg-transparent text-base text-foreground outline-none',
            'placeholder:text-muted-foreground',
          ].join(' ')}
          {...register('query')}
        />

        {hasText ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label={t.clearSearch}
            className={[
              'grid size-11 shrink-0 cursor-pointer place-items-center rounded-full',
              'text-muted-foreground outline-none',
              'transition-colors duration-[var(--duration-fast)] ease-[var(--ease)]',
              'hover:bg-surface-hover hover:text-foreground',
            ].join(' ')}
          >
            <X className="size-5" aria-hidden />
          </button>
        ) : null}

        <button
          type="submit"
          disabled={isSearching}
          aria-label={t.searchSubmitLabel}
          className={[
            'grid size-11 shrink-0 cursor-pointer place-items-center rounded-full',
            'bg-brand text-on-brand outline-none',
            'transition-colors duration-[var(--duration-normal)] ease-[var(--ease)]',
            'hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-45',
          ].join(' ')}
        >
          <Search className={isSearching ? 'size-5 animate-pulse' : 'size-5'} aria-hidden />
        </button>
      </div>

      {/* The shared Zod schema's own message is API-facing English only;
          the visible error here is always the current locale's translation,
          shown whenever validation fails regardless of that message's text. */}
      {errors.query ? (
        <p id="search-query-error" role="alert" className="type-caption text-destructive">
          {t.searchRequiredError}
        </p>
      ) : null}
    </form>
  );
}
