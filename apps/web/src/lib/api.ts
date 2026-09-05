import type {
  CheckoutSessionResponse,
  CurrentUserResponse,
  Locale,
  NutritionInfo,
  ProductDetail,
  RecentSearchItem,
  SearchResult,
  SubscriptionStatusResponse,
} from '@open-food/shared';
import { env } from './env';

export class ApiError extends Error {
  readonly status: number;

  readonly fieldErrors?: Record<string, string[]>;

  // Set when the API identifies the failure precisely enough for the UI to
  // say something better than "something went wrong" (see BILLING_NOT_CONFIGURED).
  readonly code?: string;

  constructor(
    message: string,
    status: number,
    fieldErrors?: Record<string, string[]>,
    code?: string,
  ) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.code = code;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, init);

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
      errors?: Record<string, string[]>;
      code?: string;
    } | null;
    throw new ApiError(
      body?.message ?? 'Something went wrong.',
      response.status,
      body?.errors,
      body?.code,
    );
  }

  return response.json() as Promise<T>;
}

export function searchProducts(
  query: string,
  locale: Locale,
  page = 1,
): Promise<SearchResult> {
  const params = new URLSearchParams({ query, locale, page: String(page) });
  return apiFetch<SearchResult>(`/products/search?${params.toString()}`);
}

export function getProduct(id: string, locale: Locale): Promise<ProductDetail> {
  const params = new URLSearchParams({ locale });
  return apiFetch<ProductDetail>(`/products/${encodeURIComponent(id)}?${params.toString()}`);
}

export function getRecentSearches(): Promise<RecentSearchItem[]> {
  return apiFetch<RecentSearchItem[]>('/recent-searches');
}

export function getNutrition(id: string): Promise<NutritionInfo> {
  return apiFetch<NutritionInfo>(`/products/${encodeURIComponent(id)}/nutrition`);
}

export function getCurrentUser(): Promise<CurrentUserResponse> {
  return apiFetch<CurrentUserResponse>('/me');
}

export function getSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
  return apiFetch<SubscriptionStatusResponse>('/billing/subscription-status');
}

export function createCheckoutSession(): Promise<CheckoutSessionResponse> {
  return apiFetch<CheckoutSessionResponse>('/billing/checkout-session', { method: 'POST' });
}
