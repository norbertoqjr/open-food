import {
  Controller, Get, Param, Query,
} from '@nestjs/common';
import { searchQuerySchema, type ProductSummary, type SearchResult } from '@open-food/shared';
import * as z from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { ProductsService } from './products.service.js';

const productIdSchema = z.string().trim().min(1);

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
  ): Promise<ProductSummary> {
    return this.products.getProduct(id);
  }
}
