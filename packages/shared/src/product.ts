// Explicit public projection of an Open Food Facts product. Deliberately
// excludes nutrition and every other upstream field — the API maps onto
// this type at the adapter boundary, so nothing more can leak through.
export interface ProductSummary {
  id: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
}

// Everything the product page shows beyond the search-result fields. Kept
// free of nutrition data: nutriments and the Nutri-Score derived from them
// are subscriber-only and travel on NutritionInfo instead.
//
// Tag lists (allergens, categories, labels, countries) are Open Food Facts'
// canonical English taxonomy values, humanised from e.g. "en:palm-oil-free".
// Upstream has no translation for them, so they are not localised; the
// labels around them are.
export interface ProductDetail extends ProductSummary {
  genericName: string | null;
  quantity: string | null;
  servingSize: string | null;
  ingredientsText: string | null;
  allergens: string[];
  categories: string[];
  labels: string[];
  countries: string[];
  novaGroup: number | null;
  ecoScore: string | null;
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
