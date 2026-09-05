import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type {
  Locale, NutritionInfo, ProductDetail, ProductSummary,
} from '@open-food/shared';
import { TaxonomyService, type TagType } from './taxonomy.service.js';

// Legacy full-text search (world.openfoodfacts.org/api/v2/search) is
// deprecated and frequently 503s; Search-a-licious is the current search
// service. The single-product-by-barcode endpoint is unaffected by that
// migration and still lives on the legacy host.
const SEARCH_BASE_URL = 'https://search.openfoodfacts.org';
const PRODUCT_BASE_URL = 'https://world.openfoodfacts.org';
const USER_AGENT = 'OpenFood/1.0 (open-food-technical-assignment)';
const REQUEST_TIMEOUT_MS = 5000;
const BASE_FIELDS = ['code', 'brands', 'image_url'];
const DETAIL_FIELDS = [
  'quantity', 'serving_size',
  'allergens_tags', 'categories_tags', 'labels_tags', 'countries_tags',
  'nova_group', 'ecoscore_grade',
];

// Open Food Facts names a per-language field product_name_<lc> alongside
// the generic product_name (itself usually the original submitter's
// language, not necessarily English). Confirmed live: a product can carry
// product_name_de/fr/nl while product_name_en is wrong or absent, so English
// is a fallback rung, never the first choice.
interface LocalizedNameFields {
  product_name?: string;
  product_name_en?: string;
  product_name_nl?: string;
  product_name_de?: string;
  product_name_fr?: string;
}

interface UpstreamHit extends LocalizedNameFields {
  code?: string;
  brands?: string[];
  image_url?: string;
}

interface SearchAliciousResponse {
  hits: UpstreamHit[];
  count: number;
}

interface UpstreamProduct extends LocalizedNameFields {
  code?: string;
  brands?: string;
  image_url?: string;
  generic_name?: string;
  generic_name_en?: string;
  generic_name_nl?: string;
  generic_name_de?: string;
  generic_name_fr?: string;
  quantity?: string;
  serving_size?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  ingredients_text_nl?: string;
  ingredients_text_de?: string;
  ingredients_text_fr?: string;
  allergens_tags?: string[];
  categories_tags?: string[];
  labels_tags?: string[];
  countries_tags?: string[];
  nova_group?: number;
  ecoscore_grade?: string;
}

interface ProductOpenerResponse {
  status: number;
  product?: UpstreamProduct;
}

export interface SearchOutcome {
  items: ProductSummary[];
  total: number;
}

interface Nutriments {
  'energy-kcal_100g'?: number;
  fat_100g?: number;
  'saturated-fat_100g'?: number;
  carbohydrates_100g?: number;
  sugars_100g?: number;
  fiber_100g?: number;
  proteins_100g?: number;
  salt_100g?: number;
}

interface NutritionResponse {
  status: number;
  product?: {
    code?: string;
    nutriments?: Nutriments;
    nutrition_data_per?: string;
    nutriscore_grade?: string;
  };
}

// Open Food Facts tags arrive as canonical taxonomy ids ("en:palm-oil-free").
// A product with a null category yields the literal "en:null", and unknown
// grades arrive as the strings "unknown"/"not-applicable" rather than being
// omitted — all of which must read as absent, not as a value.
const ABSENT_TAG_VALUES = new Set(['null', 'unknown', 'not-applicable', 'none', '']);

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function stripTagPrefix(tag: string): string {
  return tag.replace(/^[a-z]{2}:/, '').trim();
}

// Fallback rendering for a tag the taxonomy could not translate: the
// canonical id made readable ("en:palm-oil-free" -> "Palm oil free").
function humanizeTag(tag: string, titleCase: boolean): string {
  const words = stripTagPrefix(tag).replace(/-/g, ' ');
  return titleCase ? words.split(' ').map(capitalize).join(' ') : capitalize(words);
}

// Open Food Facts files the Nutri-Score grade as a *label* as well
// ("en:nutriscore-grade-a"), which would publish for free the very thing the
// subscription gates -- and inconsistently, since a product can carry two
// contradictory grades at once. Stripped from the label list; the real grade
// travels on the subscriber-only NutritionInfo.
const PAYWALLED_LABEL_PREFIX = 'nutriscore';

// Drops upstream placeholders before anything tries to render or translate
// them. Keeps the canonical ids intact, since that is what the taxonomy
// endpoint is keyed by.
function usableTags(tags: string[] | undefined): string[] {
  return (tags ?? []).filter(
    (tag) => !ABSENT_TAG_VALUES.has(stripTagPrefix(tag).toLowerCase()),
  );
}

function labelTags(tags: string[] | undefined): string[] {
  return usableTags(tags).filter(
    (tag) => !stripTagPrefix(tag).toLowerCase().startsWith(PAYWALLED_LABEL_PREFIX),
  );
}

function gradeOrNull(grade: string | undefined): string | null {
  const normalized = grade?.trim().toLowerCase();
  return normalized && !ABSENT_TAG_VALUES.has(normalized) ? normalized : null;
}

function nameFieldsFor(locale: Locale): string[] {
  const names = new Set(['product_name', 'product_name_en', `product_name_${locale}`]);
  return [...names];
}

function ingredientFieldsFor(locale: Locale): string[] {
  const fields = new Set([
    'ingredients_text', 'ingredients_text_en', `ingredients_text_${locale}`,
  ]);
  return [...fields];
}

function genericNameFieldsFor(locale: Locale): string[] {
  const fields = new Set(['generic_name', 'generic_name_en', `generic_name_${locale}`]);
  return [...fields];
}

// Only language-tagged fields, and English as the single fallback. The
// untagged `ingredients_text` is NOT reliably the submitter's language --
// on real records it is a multilingual dump off the packaging (one product
// carries German and Bulgarian in the same field while declaring lang=en),
// so falling back to it showed an English reader German ingredients.
//
// Returning null instead makes the UI say the list is unavailable, which is
// honest. That matters more here than elsewhere: an ingredient list is where
// allergens are declared, and one in a language the reader cannot parse is
// worse than an explicit absence.
function resolveIngredientsText(product: UpstreamProduct, locale: Locale): string | null {
  const byLocale: Record<Locale, string | undefined> = {
    en: product.ingredients_text_en,
    nl: product.ingredients_text_nl,
    de: product.ingredients_text_de,
    fr: product.ingredients_text_fr,
  };

  return (
    byLocale[locale]?.trim()
    || product.ingredients_text_en?.trim()
    || null
  );
}

// Never fabricates a translation: picks among the values Open Food Facts
// already has. A tagged English name is preferred over the untagged field,
// which carries no language claim at all; the untagged one is still the last
// resort, because a name is an identifier and showing the wrong language
// beats showing "Unnamed product". Prose fields do not take that trade --
// see resolveIngredientsText.
function resolveLocalizedName(record: LocalizedNameFields, locale: Locale): string | null {
  const byLocale: Record<Locale, string | undefined> = {
    en: record.product_name_en,
    nl: record.product_name_nl,
    de: record.product_name_de,
    fr: record.product_name_fr,
  };

  return (
    byLocale[locale]?.trim()
    || record.product_name_en?.trim()
    || record.product_name?.trim()
    || null
  );
}

// Prose, so it follows the ingredients rule rather than the name one: tagged
// fields only, English as the single fallback, otherwise nothing. A
// description is read for meaning, and one in an unexpected language is
// noise rather than information.
//
// Upstream also often repeats the product name or the brand here ("Nutella"
// as the generic name of Nutella); that check runs on the resolved value, so
// it still catches a duplicate that only appears in one language.
function resolveGenericName(product: UpstreamProduct, locale: Locale): string | null {
  const byLocale: Record<Locale, string | undefined> = {
    en: product.generic_name_en,
    nl: product.generic_name_nl,
    de: product.generic_name_de,
    fr: product.generic_name_fr,
  };

  const generic = (
    byLocale[locale]?.trim()
    || product.generic_name_en?.trim()
    || ''
  );

  if (!generic) return null;

  const duplicates = [resolveLocalizedName(product, locale), product.brands?.trim()]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());

  return duplicates.includes(generic.toLowerCase()) ? null : generic;
}

@Injectable()
export class OpenFoodFactsService {
  private readonly logger = new Logger(OpenFoodFactsService.name);

  constructor(private readonly taxonomy: TaxonomyService) {}

  private async localizeTags(
    tagType: TagType,
    tags: string[],
    locale: Locale,
    titleCase = false,
  ): Promise<string[]> {
    const names = await this.taxonomy.translate(
      tagType,
      tags,
      locale,
      (tag) => humanizeTag(tag, titleCase),
    );

    // The taxonomy is inconsistent about case -- "Ballaststoffquelle" but
    // "gluten" -- so the first letter is normalised for display. Only the
    // first, to leave acronyms and multi-word names ("DLG Goldener Preis")
    // exactly as the taxonomy spells them.
    return names.map(capitalize);
  }

  async search(
    query: string,
    page: number,
    pageSize: number,
    locale: Locale,
  ): Promise<SearchOutcome> {
    const url = new URL('/search', SEARCH_BASE_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('page', String(page));
    url.searchParams.set('page_size', String(pageSize));
    url.searchParams.set('fields', [...BASE_FIELDS, ...nameFieldsFor(locale)].join(','));

    const data = await this.fetchJson<SearchAliciousResponse>(url);

    return {
      items: (data.hits ?? [])
        .filter((hit): hit is UpstreamHit & { code: string } => Boolean(hit.code))
        .map((hit) => ({
          id: hit.code,
          name: resolveLocalizedName(hit, locale),
          brand: hit.brands?.length ? hit.brands.join(', ') : null,
          imageUrl: hit.image_url?.trim() || null,
        })),
      total: data.count ?? 0,
    };
  }

  async getProduct(code: string, locale: Locale): Promise<ProductDetail | null> {
    const url = new URL(`/api/v2/product/${encodeURIComponent(code)}.json`, PRODUCT_BASE_URL);
    url.searchParams.set('fields', [
      ...BASE_FIELDS,
      ...DETAIL_FIELDS,
      ...nameFieldsFor(locale),
      ...ingredientFieldsFor(locale),
      ...genericNameFieldsFor(locale),
    ].join(','));

    const data = await this.fetchJson<ProductOpenerResponse>(url);

    const { product } = data;

    if (data.status !== 1 || !product?.code) {
      return null;
    }

    // Tag lists arrive as canonical English ids whatever the locale, so each
    // type is translated through the taxonomy endpoint. Fetched together
    // rather than in sequence, and served from cache after first use.
    const [allergens, categories, labels, countries] = await Promise.all([
      this.localizeTags('allergens', usableTags(product.allergens_tags), locale),
      this.localizeTags('categories', usableTags(product.categories_tags), locale),
      this.localizeTags('labels', labelTags(product.labels_tags), locale),
      // Country names are proper nouns, so an untranslated fallback needs
      // title case or it reads as "United states".
      this.localizeTags('countries', usableTags(product.countries_tags), locale, true),
    ]);

    return {
      id: product.code,
      name: resolveLocalizedName(product, locale),
      brand: product.brands?.trim() || null,
      imageUrl: product.image_url?.trim() || null,
      // A generic name identical to the product name adds nothing.
      genericName: resolveGenericName(product, locale),
      quantity: product.quantity?.trim() || null,
      servingSize: product.serving_size?.trim() || null,
      ingredientsText: resolveIngredientsText(product, locale),
      allergens,
      categories,
      labels,
      countries,
      novaGroup: typeof product.nova_group === 'number' ? product.nova_group : null,
      ecoScore: gradeOrNull(product.ecoscore_grade),
    };
  }

  // Returns null for a product Open Food Facts knows about but has no
  // nutrition data for, distinct from getProduct's null (product unknown).
  async getNutrition(code: string): Promise<NutritionInfo | null> {
    const url = new URL(`/api/v2/product/${encodeURIComponent(code)}.json`, PRODUCT_BASE_URL);
    url.searchParams.set('fields', 'code,nutriments,nutrition_data_per,nutriscore_grade');

    const data = await this.fetchJson<NutritionResponse>(url);

    if (data.status !== 1 || !data.product?.nutriments) {
      return null;
    }

    const n = data.product.nutriments;

    return {
      basis: data.product.nutrition_data_per ?? '100g',
      energyKcal: n['energy-kcal_100g'] ?? null,
      fat: n.fat_100g ?? null,
      saturatedFat: n['saturated-fat_100g'] ?? null,
      carbohydrates: n.carbohydrates_100g ?? null,
      sugars: n.sugars_100g ?? null,
      fiber: n.fiber_100g ?? null,
      proteins: n.proteins_100g ?? null,
      salt: n.salt_100g ?? null,
      nutriScore: gradeOrNull(data.product.nutriscore_grade),
    };
  }

  private async fetchJson<T>(url: URL): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Open Food Facts responded with ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      this.logger.error(
        'Open Food Facts request failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException('Product data is temporarily unavailable.');
    } finally {
      clearTimeout(timeout);
    }
  }
}
