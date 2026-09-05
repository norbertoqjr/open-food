import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { SubscriptionGuard } from './subscription.guard.js';
import { SubscriptionsService } from './subscriptions.service.js';

@Module({
  imports: [UsersModule],
  providers: [SubscriptionsService, SubscriptionGuard],
  exports: [SubscriptionsService, SubscriptionGuard],
})
export class SubscriptionsModule {}
