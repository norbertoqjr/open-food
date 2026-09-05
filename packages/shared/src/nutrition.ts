// Canonical nutrition label fields, mapped from whichever of Open Food
// Facts' many nutriments keys are present. All null when Open Food Facts
// has no nutrition data at all for a product.
export interface NutritionInfo {
  basis: string | null;
  energyKcal: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbohydrates: number | null;
  sugars: number | null;
  fiber: number | null;
  proteins: number | null;
  salt: number | null;
  // Nutri-Score is computed from the nutriments above, so it is part of the
  // subscriber-only payload rather than the free product detail.
  nutriScore: string | null;
}

export interface SubscriptionStatusResponse {
  active: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

export interface CheckoutSessionResponse {
  url: string;
}

// Returned as `code` when Stripe rejects our credentials, so the frontend can
// say "billing isn't set up" instead of "try again" — retrying never fixes a
// missing or invalid API key. Never carries the key itself.
export const BILLING_NOT_CONFIGURED = 'billing_not_configured';
