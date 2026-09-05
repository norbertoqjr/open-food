import {
  Controller, Get, Header, Param, Query, UseGuards,
} from '@nestjs/common';
import {
  searchQuerySchema, type NutritionInfo, type ProductSummary, type SearchResult,
} from '@open-food/shared';
import * as z from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { SubscriptionGuard } from '../subscriptions/subscription.guard.js';
import { ProductsService } from './products.service.js';

const productIdSchema = z.string().trim().min(1);
const productDetailQuerySchema = searchQuerySchema.pick({ locale: true });

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get('search')
  search(
    @Query(new ZodValidationPipe(searchQuerySchema)) query: z.infer<typeof searchQuerySchema>,
  ): Promise<SearchResult> {
    return this.products.search(query);
  }

  @Get(':id')
  getProduct(
    @Param('id', new ZodValidationPipe(productIdSchema)) id: string,
    @Query(new ZodValidationPipe(productDetailQuerySchema))
    { locale }: z.infer<typeof productDetailQuerySchema>,
  ): Promise<ProductSummary> {
    return this.products.getProduct(id, locale);
  }

  // Guarded on every request, not just at page load, and explicitly
  // never cached by a shared cache: entitlement can change between
  // requests, and a stale shared response would leak nutrition to a
  // now-unsubscribed user or another unrelated client.
  @Get(':id/nutrition')
  @UseGuards(SubscriptionGuard)
  @Header('Cache-Control', 'private, no-store')
  getNutrition(
    @Param('id', new ZodValidationPipe(productIdSchema)) id: string,
  ): Promise<NutritionInfo> {
    return this.products.getNutrition(id);
  }
}
