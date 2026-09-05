// One place that knows how a search is spelled in the URL, so the search
// page, the result cards, and a product's back link cannot drift apart.
//
// Page 1 is left out of the URL entirely: it is the default, and carrying
// "&page=1" would give the same result set two different addresses.
export const DEFAULT_PAGE = 1;

export function buildSearchQuery(query: string, page: number): string {
  const params = new URLSearchParams({ q: query });
  if (page > DEFAULT_PAGE) params.set('page', String(page));
  return params.toString();
}

export function buildSearchHref(query: string, page: number): string {
  return query ? `/?${buildSearchQuery(query, page)}` : '/';
}

// Anything unparseable, zero, or negative reads as page 1 rather than
// failing: the value is user-editable in the address bar.
export function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= DEFAULT_PAGE ? page : DEFAULT_PAGE;
}
