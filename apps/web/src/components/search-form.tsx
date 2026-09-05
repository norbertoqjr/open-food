'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { searchFormSchema, type SearchFormValues } from '@open-food/shared';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SearchFormProps {
  query: string;
  onSearch: (query: string) => void;
  isSearching: boolean;
}

// react-hook-form directly, not shadcn's Form wrapper: the Base UI registry
// this project initialized with does not ship a working Form component (see
// the shadcn-nextjs skill). A single text field needs no Controller either.
export function SearchForm({ query, onSearch, isSearching }: SearchFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SearchFormValues>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: { query },
  });

  useEffect(() => {
    reset({ query });
  }, [query, reset]);

  return (
    <form
      onSubmit={handleSubmit((values) => onSearch(values.query))}
      className="flex w-full max-w-md flex-col gap-2"
      noValidate
    >
      <Label htmlFor="search-query">Search packaged foods</Label>
      <div className="flex gap-2">
        <Input
          id="search-query"
          placeholder="e.g. nutella"
          aria-invalid={Boolean(errors.query)}
          {...register('query')}
        />
        <Button type="submit" disabled={isSearching}>
          {isSearching ? 'Searching…' : 'Search'}
        </Button>
      </div>
      {errors.query ? (
        <p role="alert" className="text-sm text-destructive">
          {errors.query.message}
        </p>
      ) : null}
    </form>
  );
}
