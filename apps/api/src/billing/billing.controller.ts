import {
  BadRequestException, Controller, Get, Headers, HttpCode, Post, Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { CheckoutSessionResponse, SubscriptionStatusResponse } from '@open-food/shared';
import type { Request } from 'express';
import { StripeService } from '../stripe/stripe.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { DemoUserService } from '../users/demo-user.service.js';
import { BillingService } from './billing.service.js';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly stripe: StripeService,
    private readonly subscriptions: SubscriptionsService,
    private readonly demoUser: DemoUserService,
  ) {}

  @Post('checkout-session')
  createCheckoutSession(): Promise<CheckoutSessionResponse> {
    return this.billing.createCheckoutSession();
  }

  @Get('subscription-status')
  async subscriptionStatus(): Promise<SubscriptionStatusResponse> {
    const user = await this.demoUser.getDemoUser();
    return this.subscriptions.getStatus(user.id);
  }

  // Verified against the raw body (rawBody: true in main.ts); a parsed body
  // would silently break signature verification. Returns 400 only for a bad
  // signature — any other failure while processing an already-verified
  // event is left to bubble as a 500 so Stripe's automatic retries apply.
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    if (!req.rawBody || !signature) {
      throw new BadRequestException('Missing Stripe signature or request body.');
    }

    let event;
    try {
      event = this.stripe.constructWebhookEvent(req.rawBody, signature);
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature.');
    }

    await this.subscriptions.handleWebhookEvent(event);

    return { received: true };
  }
}
