import { Injectable } from '@nestjs/common';
import type { CheckoutSessionResponse } from '@open-food/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { StripeService } from '../stripe/stripe.service.js';
import { DemoUserService } from '../users/demo-user.service.js';

@Injectable()
export class BillingService {
  constructor(
    private readonly stripe: StripeService,
    private readonly prisma: PrismaService,
    private readonly demoUser: DemoUserService,
  ) {}

  async createCheckoutSession(): Promise<CheckoutSessionResponse> {
    const user = await this.demoUser.getDemoUser();
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
