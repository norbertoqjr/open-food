import * as z from 'zod';
import { SUPPORTED_LOCALES } from './locale.js';

// Full API contract for GET /products/search. Trimming and a nonempty
// minimum turn a whitespace-only query into a validation error rather than
// an expensive, meaningless upstream request.
export const searchQuerySchema = z.object({
  query: z.string().trim().min(1, 'Enter a search term'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50)
    .default(10),
  locale: z.enum(SUPPORTED_LOCALES).default('en'),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

// The search form only collects free text; page, pageSize, and locale come
// from pagination controls and the locale selector, not user typing.
export const searchFormSchema = searchQuerySchema.pick({ query: true });

export type SearchFormValues = z.infer<typeof searchFormSchema>;
