import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { BillingModule } from './billing/billing.module.js';
import { validate } from './config/env.validation.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProductsModule } from './products/products.module.js';
import { RecentSearchesModule } from './recent-searches/recent-searches.module.js';
import { SubscriptionsModule } from './subscriptions/subscriptions.module.js';
import { CurrentUserModule } from './users/current-user.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    PrismaModule,
    UsersModule,
    CurrentUserModule,
    ProductsModule,
    RecentSearchesModule,
    SubscriptionsModule,
    BillingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
