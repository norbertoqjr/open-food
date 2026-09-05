import { Controller, Get } from '@nestjs/common';
import type { RecentSearchItem } from '@open-food/shared';
import { DemoUserService } from '../users/demo-user.service.js';
import { RecentSearchesService } from './recent-searches.service.js';

@Controller('recent-searches')
export class RecentSearchesController {
  constructor(
    private readonly recentSearches: RecentSearchesService,
    private readonly demoUser: DemoUserService,
  ) {}

  @Get()
  async list(): Promise<RecentSearchItem[]> {
    const demoUser = await this.demoUser.getDemoUser();
    return this.recentSearches.list(demoUser.id);
  }
}
