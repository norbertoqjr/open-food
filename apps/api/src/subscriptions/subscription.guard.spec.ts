import { ForbiddenException } from '@nestjs/common';
import { DemoUserService } from '../users/demo-user.service.js';
import { SubscriptionGuard } from './subscription.guard.js';
import { SubscriptionsService } from './subscriptions.service.js';

function buildGuard(hasAccess: boolean) {
  const demoUser = { getDemoUser: vi.fn().mockResolvedValue({ id: 'user_1' }) } as unknown as
    DemoUserService;
  const subscriptions = { hasActiveAccess: vi.fn().mockResolvedValue(hasAccess) } as unknown as
    SubscriptionsService;
  return new SubscriptionGuard(demoUser, subscriptions);
}

describe('SubscriptionGuard', () => {
  it('allows the request through for an entitled user', async () => {
    const guard = buildGuard(true);
    expect(await guard.canActivate()).toBe(true);
  });

  it('rejects the request for a user without an active subscription', async () => {
    const guard = buildGuard(false);
    await expect(guard.canActivate()).rejects.toThrow(ForbiddenException);
  });
});
