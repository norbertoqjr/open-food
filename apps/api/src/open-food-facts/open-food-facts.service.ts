import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { Locale, NutritionInfo, ProductSummary } from '@open-food/shared';

// Legacy full-text search (world.openfoodfacts.org/api/v2/search) is
// deprecated and frequently 503s; Search-a-licious is the current search
// service. The single-product-by-barcode endpoint is unaffected by that
// migration and still lives on the legacy host.
const SEARCH_BASE_URL = 'https://search.openfoodfacts.org';
const PRODUCT_BASE_URL = 'https://world.openfoodfacts.org';
const USER_AGENT = 'OpenFood/1.0 (open-food-technical-assignment)';
const REQUEST_TIMEOUT_MS = 5000;
const BASE_FIELDS = ['code', 'brands', 'image_url'];

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
  };
}

function nameFieldsFor(locale: Locale): string[] {
  const names = new Set(['product_name', 'product_name_en', `product_name_${locale}`]);
  return [...names];
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

  async getProduct(code: string, locale: Locale): Promise<ProductSummary | null> {
    const url = new URL(`/api/v2/product/${encodeURIComponent(code)}.json`, PRODUCT_BASE_URL);
    url.searchParams.set('fields', [...BASE_FIELDS, ...nameFieldsFor(locale)].join(','));

    const data = await this.fetchJson<ProductOpenerResponse>(url);

    if (data.status !== 1 || !data.product?.code) {
      return null;
    }

    return {
      id: data.product.code,
      name: resolveLocalizedName(data.product, locale),
      brand: data.product.brands?.trim() || null,
      imageUrl: data.product.image_url?.trim() || null,
    };
  }

  // Returns null for a product Open Food Facts knows about but has no
  // nutrition data for, distinct from getProduct's null (product unknown).
  async getNutrition(code: string): Promise<NutritionInfo | null> {
    const url = new URL(`/api/v2/product/${encodeURIComponent(code)}.json`, PRODUCT_BASE_URL);
    url.searchParams.set('fields', 'code,nutriments,nutrition_data_per');

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
