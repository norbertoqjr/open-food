import type { en } from './en';

export const fr = {
  appTitle: 'Open Food',
  appTagline: 'Recherchez des aliments emballés par nom ou marque.',
  searchLabel: 'Rechercher des aliments emballés',
  searchPlaceholder: 'p. ex. nutella',
  searchButton: 'Rechercher',
  searchingButton: 'Recherche…',
  searchRequiredError: 'Saisissez un terme de recherche.',
  searchFailedError: 'Échec de la recherche. Réessayez.',
  recentSearchesLabel: 'Recherches récentes',
  unnamedProduct: 'Produit sans nom',
  unknownBrand: 'Marque inconnue',
  noImage: 'Aucune image',
  noImageAvailable: 'Aucune image disponible',
  noResultsFor: (query: string) => `Aucun résultat pour « ${query} ».`,
  resultsCount: (formattedTotal: string) => `${formattedTotal} résultats`,
} satisfies typeof en;
