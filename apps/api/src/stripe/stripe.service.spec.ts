import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type { ApiEnv } from '@open-food/shared';
import { StripeService } from './stripe.service.js';

// generateTestHeaderString is Stripe's own local utility for producing a
// valid HMAC signature against a fake secret — pure crypto, no network call,
// so signature verification is fully testable without live credentials.
function buildConfigService(webhookSecret: string): ConfigService<ApiEnv, true> {
  const values: Record<string, string> = {
    STRIPE_SECRET_KEY: 'sk_test_fake',
    STRIPE_WEBHOOK_SECRET: webhookSecret,
    STRIPE_MONTHLY_PRICE_ID: 'price_fake',
    STRIPE_CHECKOUT_SUCCESS_URL: 'http://localhost:3000/subscription/success',
    STRIPE_CHECKOUT_CANCEL_URL: 'http://localhost:3000/subscription/cancel',
  };
  return { get: (key: string) => values[key] } as unknown as ConfigService<ApiEnv, true>;
}

describe('StripeService.constructWebhookEvent', () => {
  const secret = 'whsec_test_secret';
  let service: StripeService;

  beforeEach(() => {
    service = new StripeService(buildConfigService(secret));
  });

  it('accepts a genuinely signed payload', () => {
    const payload = JSON.stringify({ id: 'evt_test_1', object: 'event', type: 'ping' });
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });

    const event = service.constructWebhookEvent(Buffer.from(payload), header);

    expect(event.id).toBe('evt_test_1');
  });

  it('rejects a payload signed with the wrong secret', () => {
    const payload = JSON.stringify({ id: 'evt_test_2', object: 'event', type: 'ping' });
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: 'whsec_a_different_secret',
    });

    expect(() => service.constructWebhookEvent(Buffer.from(payload), header)).toThrow();
  });

  it('rejects a tampered payload even with a validly-formed signature', () => {
    const original = JSON.stringify({ id: 'evt_test_3', object: 'event', type: 'ping' });
    const header = Stripe.webhooks.generateTestHeaderString({ payload: original, secret });
    const tampered = JSON.stringify({ id: 'evt_test_3_hacked', object: 'event', type: 'ping' });

    expect(() => service.constructWebhookEvent(Buffer.from(tampered), header)).toThrow();
  });
});
