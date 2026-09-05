import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { BILLING_NOT_CONFIGURED, type CheckoutSessionResponse } from '@open-food/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { StripeService } from '../stripe/stripe.service.js';
import { DemoUserService } from '../users/demo-user.service.js';

// Stripe raises this when the secret key is missing, malformed, or (as with
// the placeholder this repo ships) simply not a real key.
function isAuthenticationError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && (error as { type?: string }).type === 'StripeAuthenticationError';
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly stripe: StripeService,
    private readonly prisma: PrismaService,
    private readonly demoUser: DemoUserService,
  ) {}

  async createCheckoutSession(): Promise<CheckoutSessionResponse> {
    const user = await this.demoUser.getDemoUser();

    try {
      const customerId = await this.resolveStripeCustomerId(user.id, user.stripeCustomerId);

      const session = await this.stripe.client.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: this.stripe.monthlyPriceId, quantity: 1 }],
        success_url: this.stripe.checkoutSuccessUrl,
        cancel_url: this.stripe.checkoutCancelUrl,
      });

      if (!session.url) {
        throw new Error('Stripe did not return a Checkout Session URL.');
      }

      return { url: session.url };
    } catch (error) {
      if (isAuthenticationError(error)) {
        // Deliberately not forwarding Stripe's own message: it echoes a
        // masked form of the key, which has no business reaching a client.
        this.logger.error(
          'Stripe rejected the configured credentials. Set STRIPE_SECRET_KEY and '
          + 'STRIPE_MONTHLY_PRICE_ID in apps/api/.env (see the README).',
        );
        throw new ServiceUnavailableException({
          code: BILLING_NOT_CONFIGURED,
          message: 'Billing is not configured on this server.',
        });
      }

      throw error;
    }
  }

  private async resolveStripeCustomerId(
    userId: string,
    existingCustomerId: string | null,
  ): Promise<string> {
    if (existingCustomerId) {
      return existingCustomerId;
    }

    const customer = await this.stripe.client.customers.create();
    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }
}
