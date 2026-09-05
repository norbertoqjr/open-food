import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { ProductSummary } from '@open-food/shared';

// Legacy full-text search (world.openfoodfacts.org/api/v2/search) is
// deprecated and frequently 503s; Search-a-licious is the current search
// service. The single-product-by-barcode endpoint is unaffected by that
// migration and still lives on the legacy host.
const SEARCH_BASE_URL = 'https://search.openfoodfacts.org';
const PRODUCT_BASE_URL = 'https://world.openfoodfacts.org';
const USER_AGENT = 'OpenFood/1.0 (open-food-technical-assignment)';
const REQUEST_TIMEOUT_MS = 5000;
const SEARCH_FIELDS = 'code,product_name,brands,image_url';
const PRODUCT_FIELDS = 'code,product_name,brands,image_url';

interface UpstreamHit {
  code?: string;
  product_name?: string;
  brands?: string[];
  image_url?: string;
}

interface SearchAliciousResponse {
  hits: UpstreamHit[];
  count: number;
}

interface UpstreamProduct {
  code?: string;
  product_name?: string;
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

@Injectable()
export class OpenFoodFactsService {
  private readonly logger = new Logger(OpenFoodFactsService.name);

  async search(query: string, page: number, pageSize: number): Promise<SearchOutcome> {
    const url = new URL('/search', SEARCH_BASE_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('page', String(page));
    url.searchParams.set('page_size', String(pageSize));
    url.searchParams.set('fields', SEARCH_FIELDS);

    const data = await this.fetchJson<SearchAliciousResponse>(url);

    return {
      items: (data.hits ?? [])
        .filter((hit): hit is UpstreamHit & { code: string } => Boolean(hit.code))
        .map((hit) => ({
          id: hit.code,
          name: hit.product_name?.trim() || null,
          brand: hit.brands?.length ? hit.brands.join(', ') : null,
          imageUrl: hit.image_url?.trim() || null,
        })),
      total: data.count ?? 0,
    };
  }

  async getProduct(code: string): Promise<ProductSummary | null> {
    const url = new URL(`/api/v2/product/${encodeURIComponent(code)}.json`, PRODUCT_BASE_URL);
    url.searchParams.set('fields', PRODUCT_FIELDS);

    const data = await this.fetchJson<ProductOpenerResponse>(url);

    if (data.status !== 1 || !data.product?.code) {
      return null;
    }

    return {
      id: data.product.code,
      name: data.product.product_name?.trim() || null,
      brand: data.product.brands?.trim() || null,
      imageUrl: data.product.image_url?.trim() || null,
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
