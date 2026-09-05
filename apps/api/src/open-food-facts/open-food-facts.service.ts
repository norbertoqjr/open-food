import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type {
  Locale, NutritionInfo, ProductDetail, ProductSummary,
} from '@open-food/shared';

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
  'generic_name', 'quantity', 'serving_size',
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

// Sentence case by default ("Palm oil free"); title case for country names,
// which are proper nouns and would otherwise read as "United states".
function humanizeTags(tags: string[] | undefined, titleCase = false): string[] {
  return (tags ?? [])
    .map((tag) => tag.replace(/^[a-z]{2}:/, '').trim())
    .filter((tag) => !ABSENT_TAG_VALUES.has(tag.toLowerCase()))
    .map((tag) => tag.replace(/-/g, ' '))
    .map((tag) => (titleCase ? tag.split(' ').map(capitalize).join(' ') : capitalize(tag)));
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

// Same precedence as the product name: the requested locale, then whatever
// the submitter wrote, then English. Never a machine translation.
function resolveIngredientsText(product: UpstreamProduct, locale: Locale): string | null {
  const byLocale: Record<Locale, string | undefined> = {
    en: product.ingredients_text_en,
    nl: product.ingredients_text_nl,
    de: product.ingredients_text_de,
    fr: product.ingredients_text_fr,
  };

  return (
    byLocale[locale]?.trim()
    || product.ingredients_text?.trim()
    || product.ingredients_text_en?.trim()
    || null
  );
}

// Never fabricates a translation: picks among the actual values Open Food
// Facts already has, preferring the requested locale, then the generic
// field, then English. A caller with no matching value gets null and shows
// its own translated "name unavailable" label.
function resolveLocalizedName(record: LocalizedNameFields, locale: Locale): string | null {
  const byLocale: Record<Locale, string | undefined> = {
    en: record.product_name_en,
    nl: record.product_name_nl,
    de: record.product_name_de,
    fr: record.product_name_fr,
  };

  return (
    byLocale[locale]?.trim()
    || record.product_name?.trim()
    || record.product_name_en?.trim()
    || null
  );
}

// Upstream often repeats the product name or the brand here ("Nutella" as
// the generic name of Nutella), which would render as a duplicate line.
function resolveGenericName(product: UpstreamProduct, locale: Locale): string | null {
  const generic = product.generic_name?.trim();
  if (!generic) return null;

  const duplicates = [resolveLocalizedName(product, locale), product.brands?.trim()]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());

  return duplicates.includes(generic.toLowerCase()) ? null : generic;
}

@Injectable()
export class OpenFoodFactsService {
  private readonly logger = new Logger(OpenFoodFactsService.name);

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
    ].join(','));

    const data = await this.fetchJson<ProductOpenerResponse>(url);

    const { product } = data;

    if (data.status !== 1 || !product?.code) {
      return null;
    }

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
      allergens: humanizeTags(product.allergens_tags),
      categories: humanizeTags(product.categories_tags),
      labels: humanizeTags(product.labels_tags),
      countries: humanizeTags(product.countries_tags, true),
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
