import type { SubscriptionStatusResponse } from './nutrition.js';

// The app has no authentication: every request acts as the single demo user
// (see DEMO_USER_ID). This is what the UI shows so that the acting identity,
// and the subscription that gates nutrition data, are visible rather than
// implicit.
export interface CurrentUserResponse {
  id: string;
  memberSince: string;
  subscription: SubscriptionStatusResponse;
}
