import { Module } from '@nestjs/common';
import { OpenFoodFactsService } from './open-food-facts.service.js';
import { TaxonomyService } from './taxonomy.service.js';

@Module({
  providers: [OpenFoodFactsService, TaxonomyService],
  exports: [OpenFoodFactsService],
})
export class OpenFoodFactsModule {}
