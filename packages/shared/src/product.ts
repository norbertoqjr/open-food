// Explicit public projection of an Open Food Facts product. Deliberately
// excludes nutrition and every other upstream field — the API maps onto
// this type at the adapter boundary, so nothing more can leak through.
export interface ProductSummary {
  id: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
}

export interface SearchResult {
  items: ProductSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface RecentSearchItem {
  id: string;
  query: string;
  locale: string;
  createdAt: string;
}
