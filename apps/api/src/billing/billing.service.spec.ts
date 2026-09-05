import { ServiceUnavailableException } from '@nestjs/common';
import { BILLING_NOT_CONFIGURED } from '@open-food/shared';
import { BillingService } from './billing.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { StripeService } from '../stripe/stripe.service.js';
import type { DemoUserService } from '../users/demo-user.service.js';

function buildService(customersCreate: ReturnType<typeof vi.fn>) {
  const stripe = {
    client: {
      customers: { create: customersCreate },
      checkout: { sessions: { create: vi.fn() } },
    },
    monthlyPriceId: 'price_test',
    checkoutSuccessUrl: 'http://localhost:3000/subscription/success',
    checkoutCancelUrl: 'http://localhost:3000/subscription/cancel',
  } as unknown as StripeService;

  const prisma = { user: { update: vi.fn() } } as unknown as PrismaService;
  const demoUser = {
    getDemoUser: vi.fn().mockResolvedValue({ id: 'demo-user', stripeCustomerId: null }),
  } as unknown as DemoUserService;

  return new BillingService(stripe, prisma, demoUser);
}

describe('BillingService.createCheckoutSession', () => {
  it('reports unconfigured billing when Stripe rejects the credentials', async () => {
    // Shape of a real Stripe SDK authentication failure.
    const authError = Object.assign(new Error('Invalid API Key provided: sk_test_***lder'), {
      type: 'StripeAuthenticationError',
    });
    const service = buildService(vi.fn().mockRejectedValue(authError));

    await expect(service.createCheckoutSession()).rejects.toThrow(ServiceUnavailableException);

    await service.createCheckoutSession().catch((error: ServiceUnavailableException) => {
      const body = error.getResponse() as { code: string; message: string };
      expect(body.code).toBe(BILLING_NOT_CONFIGURED);
      // Stripe echoes a masked key in its own message; ours must not carry it.
      expect(body.message).not.toContain('sk_test');
    });
  });

  it('lets unrelated failures through untouched', async () => {
    const service = buildService(vi.fn().mockRejectedValue(new Error('network down')));

    await expect(service.createCheckoutSession()).rejects.toThrow('network down');
  });
});
