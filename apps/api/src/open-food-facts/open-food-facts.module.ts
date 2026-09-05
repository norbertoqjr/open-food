import { Module } from '@nestjs/common';
import { OpenFoodFactsService } from './open-food-facts.service.js';

@Module({
  providers: [OpenFoodFactsService],
  exports: [OpenFoodFactsService],
})
export class OpenFoodFactsModule {}
