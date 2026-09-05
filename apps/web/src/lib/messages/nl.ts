import type { en } from './en';

export const nl = {
  appTitle: 'Open Food',
  appTagline: 'Zoek verpakte levensmiddelen op naam of merk.',
  searchLabel: 'Zoek verpakte levensmiddelen',
  searchPlaceholder: 'bijv. nutella',
  searchButton: 'Zoeken',
  searchingButton: 'Zoeken…',
  searchRequiredError: 'Voer een zoekterm in.',
  searchFailedError: 'Zoeken mislukt. Probeer het opnieuw.',
  recentSearchesLabel: 'Recente zoekopdrachten',
  unnamedProduct: 'Naamloos product',
  unknownBrand: 'Onbekend merk',
  noImage: 'Geen afbeelding',
  noImageAvailable: 'Geen afbeelding beschikbaar',
  noResultsFor: (query: string) => `Geen resultaten voor "${query}".`,
  resultsCount: (formattedTotal: string) => `${formattedTotal} resultaten`,
} satisfies typeof en;
