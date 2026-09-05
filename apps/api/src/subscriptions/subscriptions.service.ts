import { Injectable, Logger } from '@nestjs/common';
import type { SubscriptionStatusResponse } from '@open-food/shared';
import type Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubscriptionStatus } from '../generated/prisma/enums.js';

const HANDLED_EVENT_TYPES = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

// Stripe's Subscription.Status type is `'active' | ... | OtherString` — an
// open type shared with list-filter params (which also allow 'all', 'ended')
// and reserved for values the SDK's type defs don't know about yet. Never
// assign it to our closed Prisma enum without checking it's actually one of
// our known values first.
const KNOWN_STATUSES: ReadonlySet<string> = new Set(Object.values(SubscriptionStatus));

function toSubscriptionStatus(status: string): SubscriptionStatus | null {
  return KNOWN_STATUSES.has(status) ? (status as SubscriptionStatus) : null;
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async hasActiveAccess(userId: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });
    return subscription?.status === 'active';
  }

  async getStatus(userId: string): Promise<SubscriptionStatusResponse> {
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });

    if (!subscription) {
      return { active: false, cancelAtPeriodEnd: false, currentPeriodEnd: null };
    }

    return {
      active: subscription.status === 'active',
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    };
  }

  // Idempotent (a redelivered event is a no-op) and order-safe (a delayed,
  // older retry can never undo a newer state already applied).
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    const alreadyProcessed = await this.prisma.processedStripeEvent.findUnique({
      where: { id: event.id },
    });

    if (alreadyProcessed) {
      this.logger.log(`Skipping already-processed event ${event.id} (${event.type})`);
      return;
    }

    if (HANDLED_EVENT_TYPES.has(event.type)) {
      await this.applySubscriptionEvent(event);
    } else {
      this.logger.log(`Unhandled Stripe event type: ${event.type}`);
    }

    await this.prisma.processedStripeEvent.create({
      data: { id: event.id, type: event.type },
    });
  }

  private async applySubscriptionEvent(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

    const user = await this.prisma.user.findUnique({ where: { stripeCustomerId: customerId } });

    if (!user) {
      this.logger.warn(`No user found for Stripe customer ${customerId}; ignoring ${event.type}`);
      return;
    }

    const status = toSubscriptionStatus(subscription.status);

    if (!status) {
      this.logger.warn(
        `Unrecognized Stripe subscription status "${subscription.status}" on ${event.id}; ignoring`,
      );
      return;
    }

    const existing = await this.prisma.subscription.findUnique({ where: { userId: user.id } });

    if (existing && existing.lastEventAt.getTime() / 1000 >= event.created) {
      this.logger.log(
        `Ignoring stale event ${event.id} for subscription ${subscription.id}: `
        + 'a newer or equal update was already applied',
      );
      return;
    }

    // current_period_end lives on the subscription item, not the
    // subscription itself, as of the current Stripe API.
    const item = subscription.items.data[0];
    const currentPeriodEnd = item ? new Date(item.current_period_end * 1000) : null;
    const lastEventAt = new Date(event.created * 1000);

    await this.prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        stripeSubscriptionId: subscription.id,
        stripePriceId: item?.price.id ?? '',
        status,
        currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        lastEventAt,
      },
      update: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: item?.price.id ?? existing?.stripePriceId,
        status,
        currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        lastEventAt,
      },
    });
  }
}
