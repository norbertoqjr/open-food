import { checkoutSessionBodySchema, isSafeReturnPath } from '@open-food/shared';
import { BillingService } from './billing.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { StripeService } from '../stripe/stripe.service.js';
import type { DemoUserService } from '../users/demo-user.service.js';

describe('isSafeReturnPath', () => {
  it('accepts same-origin relative paths', () => {
    expect(isSafeReturnPath('/')).toBe(true);
    expect(isSafeReturnPath('/products/123')).toBe(true);
    expect(isSafeReturnPath('/products/123?q=snack')).toBe(true);
    expect(isSafeReturnPath('/products/123?q=a%2Fb&page=2#top')).toBe(true);
  });

  it.each([
    // Protocol-relative: a browser resolves these to another host.
    ['//evil.com'],
    ['//evil.com/products/1'],
    ['/\\evil.com'],
    // Absolute URLs leave the site entirely.
    ['https://evil.com'],
    // eslint-disable-next-line no-script-url -- the point is that we reject it
    ['javascript:alert(1)'],
    // A scheme hidden behind the leading slash.
    ['/https://evil.com'],
    // Not a path at all.
    ['products/123'],
    [''],
  ])('rejects %s', (value) => {
    expect(isSafeReturnPath(value)).toBe(false);
  });
});

describe('checkoutSessionBodySchema', () => {
  it('accepts an absent returnTo', () => {
    expect(checkoutSessionBodySchema.safeParse({}).success).toBe(true);
  });

  it('rejects an off-site returnTo', () => {
    expect(checkoutSessionBodySchema.safeParse({ returnTo: '//evil.com' }).success).toBe(false);
    expect(checkoutSessionBodySchema.safeParse({ returnTo: 'https://evil.com' }).success)
      .toBe(false);
  });
});

describe('BillingService.createCheckoutSession redirect URLs', () => {
  function buildService() {
    const create = vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.test/s/1' });
    const stripe = {
      client: {
        customers: { create: vi.fn() },
        checkout: { sessions: { create } },
      },
      monthlyPriceId: 'price_test',
      checkoutSuccessUrl: 'http://localhost:3000/subscription/success',
      checkoutCancelUrl: 'http://localhost:3000/subscription/cancel',
    } as unknown as StripeService;

    const prisma = { user: { update: vi.fn() } } as unknown as PrismaService;
    const demoUser = {
      getDemoUser: vi.fn().mockResolvedValue({ id: 'demo-user', stripeCustomerId: 'cus_1' }),
    } as unknown as DemoUserService;

    return { service: new BillingService(stripe, prisma, demoUser), create };
  }

  it('carries a valid return path onto both redirect URLs', async () => {
    const { service, create } = buildService();

    await service.createCheckoutSession('/products/123?q=snack');

    const args = create.mock.calls[0][0] as { success_url: string; cancel_url: string };
    expect(args.success_url).toBe(
      'http://localhost:3000/subscription/success?next=%2Fproducts%2F123%3Fq%3Dsnack',
    );
    expect(args.cancel_url).toBe(
      'http://localhost:3000/subscription/cancel?next=%2Fproducts%2F123%3Fq%3Dsnack',
    );
  });

  it('falls back to the configured URLs when no return path is given', async () => {
    const { service, create } = buildService();

    await service.createCheckoutSession();

    const args = create.mock.calls[0][0] as { success_url: string; cancel_url: string };
    expect(args.success_url).toBe('http://localhost:3000/subscription/success');
    expect(args.cancel_url).toBe('http://localhost:3000/subscription/cancel');
  });

  it('never redirects off-site, even if validation upstream were bypassed', async () => {
    const { service, create } = buildService();

    await service.createCheckoutSession('//evil.com');

    const args = create.mock.calls[0][0] as { success_url: string };
    expect(args.success_url).toBe('http://localhost:3000/subscription/success');
    expect(args.success_url).not.toContain('evil.com');
  });
});
