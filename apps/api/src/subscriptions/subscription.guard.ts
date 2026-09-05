import { CanActivate, ForbiddenException, Injectable } from '@nestjs/common';
import { DemoUserService } from '../users/demo-user.service.js';
import { SubscriptionsService } from './subscriptions.service.js';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly demoUser: DemoUserService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async canActivate(): Promise<boolean> {
    const user = await this.demoUser.getDemoUser();
    const hasAccess = await this.subscriptions.hasActiveAccess(user.id);

    if (!hasAccess) {
      throw new ForbiddenException('An active subscription is required to view nutrition.');
    }

    return true;
  }
}
