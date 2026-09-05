import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ApiEnv } from '@open-food/shared';
import Stripe from 'stripe';

// Thin wrapper so the rest of the app depends on this service, not directly
// on how the client is constructed or which env vars back it.
@Injectable()
export class StripeService {
  readonly client: Stripe;

  constructor(private readonly configService: ConfigService<ApiEnv, true>) {
    this.client = new Stripe(this.configService.get('STRIPE_SECRET_KEY', { infer: true }));
  }

  get monthlyPriceId(): string {
    return this.configService.get('STRIPE_MONTHLY_PRICE_ID', { infer: true });
  }

  get checkoutSuccessUrl(): string {
    return this.configService.get('STRIPE_CHECKOUT_SUCCESS_URL', { infer: true });
  }

  get checkoutCancelUrl(): string {
    return this.configService.get('STRIPE_CHECKOUT_CANCEL_URL', { infer: true });
  }

  // Throws Stripe.errors.StripeSignatureVerificationError on a bad or
  // tampered signature; callers turn that into a 400.
  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET', { infer: true });
    return this.client.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }
}
