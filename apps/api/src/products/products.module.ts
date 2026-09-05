import { Module } from '@nestjs/common';
import { OpenFoodFactsModule } from '../open-food-facts/open-food-facts.module.js';
import { RecentSearchesModule } from '../recent-searches/recent-searches.module.js';
import { UsersModule } from '../users/users.module.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';

@Module({
  imports: [OpenFoodFactsModule, RecentSearchesModule, UsersModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
