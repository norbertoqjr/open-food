import type { en } from './en';

export const de = {
  appTitle: 'Open Food',
  appTagline: 'Suchen Sie verpackte Lebensmittel nach Name oder Marke.',
  searchLabel: 'Verpackte Lebensmittel suchen',
  searchPlaceholder: 'z. B. nutella',
  searchButton: 'Suchen',
  searchingButton: 'Suche läuft…',
  searchRequiredError: 'Geben Sie einen Suchbegriff ein.',
  searchFailedError: 'Suche fehlgeschlagen. Bitte erneut versuchen.',
  recentSearchesLabel: 'Letzte Suchanfragen',
  unnamedProduct: 'Unbenanntes Produkt',
  unknownBrand: 'Unbekannte Marke',
  noImage: 'Kein Bild',
  noImageAvailable: 'Kein Bild verfügbar',
  noResultsFor: (query: string) => `Keine Ergebnisse für "${query}".`,
  resultsCount: (formattedTotal: string) => `${formattedTotal} Ergebnisse`,
} satisfies typeof en;
