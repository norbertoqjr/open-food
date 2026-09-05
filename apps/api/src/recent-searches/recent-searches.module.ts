import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { RecentSearchesController } from './recent-searches.controller.js';
import { RecentSearchesService } from './recent-searches.service.js';

@Module({
  imports: [UsersModule],
  controllers: [RecentSearchesController],
  providers: [RecentSearchesService],
  exports: [RecentSearchesService],
})
export class RecentSearchesModule {}
