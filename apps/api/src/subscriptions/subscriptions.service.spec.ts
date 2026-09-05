import type Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubscriptionsService } from './subscriptions.service.js';

function buildSubscriptionEvent(overrides: {
  id?: string;
  created?: number;
  status?: string;
  customer?: string;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  priceId?: string;
} = {}): Stripe.Event {
  return {
    id: overrides.id ?? 'evt_1',
    type: 'customer.subscription.updated',
    created: overrides.created ?? 1_700_000_000,
    data: {
      object: {
        id: 'sub_1',
        customer: overrides.customer ?? 'cus_1',
        status: overrides.status ?? 'active',
        cancel_at_period_end: overrides.cancelAtPeriodEnd ?? false,
        items: {
          data: [{
            current_period_end: overrides.currentPeriodEnd ?? 1_702_000_000,
            price: { id: overrides.priceId ?? 'price_1' },
          }],
        },
      },
    },
  } as unknown as Stripe.Event;
}

function buildPrismaMock() {
  return {
    processedStripeEvent: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(undefined),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: 'user_1' }),
    },
    subscription: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as PrismaService;
}

describe('SubscriptionsService.handleWebhookEvent', () => {
  it('upserts subscription state from a subscription lifecycle event', async () => {
    const prisma = buildPrismaMock();
    const service = new SubscriptionsService(prisma);

    await service.handleWebhookEvent(buildSubscriptionEvent());

    expect(prisma.subscription.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user_1' },
      create: expect.objectContaining({ status: 'active', userId: 'user_1' }),
    }));
    expect(prisma.processedStripeEvent.create).toHaveBeenCalledWith({
      data: { id: 'evt_1', type: 'customer.subscription.updated' },
    });
  });

  it('is idempotent: a redelivered event is a no-op', async () => {
    const prisma = buildPrismaMock();
    prisma.processedStripeEvent.findUnique = vi.fn().mockResolvedValue({ id: 'evt_1' });
    const service = new SubscriptionsService(prisma);

    await service.handleWebhookEvent(buildSubscriptionEvent());

    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    expect(prisma.processedStripeEvent.create).not.toHaveBeenCalled();
  });

  it('swallows the race when the same event is recorded concurrently', async () => {
    // Two simultaneous deliveries of one event both clear the findUnique
    // check; the loser hits the unique constraint on ProcessedStripeEvent.
    // That must not surface as a 500, or Stripe would redeliver an event
    // that was in fact handled.
    const prisma = buildPrismaMock();
    prisma.processedStripeEvent.create = vi.fn().mockRejectedValue(
      Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }),
    );
    const service = new SubscriptionsService(prisma);

    await expect(service.handleWebhookEvent(buildSubscriptionEvent())).resolves.toBeUndefined();
  });

  it('still surfaces an unexpected failure while recording an event', async () => {
    const prisma = buildPrismaMock();
    prisma.processedStripeEvent.create = vi.fn().mockRejectedValue(new Error('database is down'));
    const service = new SubscriptionsService(prisma);

    await expect(service.handleWebhookEvent(buildSubscriptionEvent()))
      .rejects.toThrow('database is down');
  });

  it('ignores an event older than the last one already applied', async () => {
    const prisma = buildPrismaMock();
    prisma.subscription.findUnique = vi.fn().mockResolvedValue({
      status: 'active',
      lastEventAt: new Date(1_700_500_000 * 1000),
    });
    const service = new SubscriptionsService(prisma);

    // Older than the stored lastEventAt (1_700_500_000).
    await service.handleWebhookEvent(buildSubscriptionEvent({ created: 1_700_000_000 }));

    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    // Still recorded as processed, so a later retry of this same event ID
    // doesn't re-evaluate the (now irrelevant) staleness check every time.
    expect(prisma.processedStripeEvent.create).toHaveBeenCalled();
  });

  it('applies an event newer than the last one already applied', async () => {
    const prisma = buildPrismaMock();
    prisma.subscription.findUnique = vi.fn().mockResolvedValue({
      status: 'active',
      stripePriceId: 'price_1',
      lastEventAt: new Date(1_700_000_000 * 1000),
    });
    const service = new SubscriptionsService(prisma);

    await service.handleWebhookEvent(buildSubscriptionEvent({
      created: 1_700_500_000,
      status: 'canceled',
    }));

    expect(prisma.subscription.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ status: 'canceled' }),
    }));
  });

  it('ignores a subscription event for a customer with no matching user', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique = vi.fn().mockResolvedValue(null);
    const service = new SubscriptionsService(prisma);

    await service.handleWebhookEvent(buildSubscriptionEvent());

    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
  });

  it('ignores an event carrying a status outside the known enum', async () => {
    const prisma = buildPrismaMock();
    const service = new SubscriptionsService(prisma);

    await service.handleWebhookEvent(buildSubscriptionEvent({ status: 'some_future_status' }));

    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
  });

  it('leaves subscription state untouched for an unhandled event type', async () => {
    const prisma = buildPrismaMock();
    const service = new SubscriptionsService(prisma);
    const event = { ...buildSubscriptionEvent(), type: 'invoice.paid' } as Stripe.Event;

    await service.handleWebhookEvent(event);

    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    expect(prisma.processedStripeEvent.create).toHaveBeenCalled();
  });
});

describe('SubscriptionsService.hasActiveAccess / getStatus', () => {
  it('grants access only when status is active', async () => {
    const prisma = buildPrismaMock();
    prisma.subscription.findUnique = vi.fn().mockResolvedValue({ status: 'active' });
    const service = new SubscriptionsService(prisma);

    expect(await service.hasActiveAccess('user_1')).toBe(true);
  });

  it('denies access for a canceled subscription', async () => {
    const prisma = buildPrismaMock();
    prisma.subscription.findUnique = vi.fn().mockResolvedValue({ status: 'canceled' });
    const service = new SubscriptionsService(prisma);

    expect(await service.hasActiveAccess('user_1')).toBe(false);
  });

  it('denies access when no subscription row exists', async () => {
    const prisma = buildPrismaMock();
    const service = new SubscriptionsService(prisma);

    expect(await service.hasActiveAccess('user_1')).toBe(false);
    expect(await service.getStatus('user_1')).toEqual({
      active: false,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    });
  });
});
