import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  Locale, NutritionInfo, ProductDetail, SearchQuery, SearchResult,
} from '@open-food/shared';
import { OpenFoodFactsService } from '../open-food-facts/open-food-facts.service.js';
import { RecentSearchesService } from '../recent-searches/recent-searches.service.js';
import { DemoUserService } from '../users/demo-user.service.js';

@Injectable()
export class ProductsService {
  constructor(
    private readonly openFoodFacts: OpenFoodFactsService,
    private readonly recentSearches: RecentSearchesService,
    private readonly demoUser: DemoUserService,
  ) {}

  async search({
    query, page, pageSize, locale,
  }: SearchQuery): Promise<SearchResult> {
    const { items, total } = await this.openFoodFacts.search(query, page, pageSize, locale);

    const demoUser = await this.demoUser.getDemoUser();
    await this.recentSearches.record(demoUser.id, query, locale);

    return {
      items, page, pageSize, total,
    };
  }

  async getProduct(id: string, locale: Locale): Promise<ProductDetail> {
    const product = await this.openFoodFacts.getProduct(id, locale);

    if (!product) {
      throw new NotFoundException(`No product found for "${id}".`);
    }

    return product;
  }

  async getNutrition(id: string): Promise<NutritionInfo> {
    const nutrition = await this.openFoodFacts.getNutrition(id);

    if (!nutrition) {
      throw new NotFoundException(`No nutrition data found for "${id}".`);
    }

    return nutrition;
  }
}
