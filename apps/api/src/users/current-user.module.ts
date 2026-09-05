import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { CurrentUserController } from './current-user.controller.js';
import { UsersModule } from './users.module.js';

// Separate from UsersModule on purpose: SubscriptionsModule already imports
// UsersModule, so putting this controller there would make the two modules
// circular. This one only consumes both.
@Module({
  imports: [UsersModule, SubscriptionsModule],
  controllers: [CurrentUserController],
})
export class CurrentUserModule {}
