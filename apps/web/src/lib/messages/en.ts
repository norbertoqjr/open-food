// Source of truth for interface strings: every other locale's dictionary is
// type-checked against this shape, so a missing translation is a compile
// error rather than a silent English fallback in the UI.
export const en = {
  appTitle: 'Open Food',
  appTagline: 'Search packaged foods by name or brand.',
  searchLabel: 'Search packaged foods',
  searchPlaceholder: 'e.g. nutella',
  searchButton: 'Search',
  searchingButton: 'Searching…',
  searchRequiredError: 'Enter a search term.',
  searchFailedError: 'Search failed. Try again.',
  recentSearchesLabel: 'Recent searches',
  unnamedProduct: 'Unnamed product',
  unknownBrand: 'Unknown brand',
  noImage: 'No image',
  noImageAvailable: 'No image available',
  noResultsFor: (query: string) => `No results for "${query}".`,
  resultsCount: (formattedTotal: string) => `${formattedTotal} results`,
};
