import { Module } from '@nestjs/common';
import { StripeModule } from '../stripe/stripe.module.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { UsersModule } from '../users/users.module.js';
import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';

@Module({
  imports: [StripeModule, SubscriptionsModule, UsersModule],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
