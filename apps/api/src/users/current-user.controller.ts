import { Controller, Get } from '@nestjs/common';
import type { CurrentUserResponse } from '@open-food/shared';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { DemoUserService } from './demo-user.service.js';

@Controller('me')
export class CurrentUserController {
  constructor(
    private readonly demoUser: DemoUserService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  // Takes no user identifier: the acting user is always the demo user, so
  // there is nothing a client could pass here to read someone else's data.
  @Get()
  async currentUser(): Promise<CurrentUserResponse> {
    const user = await this.demoUser.getDemoUser();

    return {
      id: user.id,
      memberSince: user.createdAt.toISOString(),
      subscription: await this.subscriptions.getStatus(user.id),
    };
  }
}
