import { Injectable } from '@nestjs/common';
import type { Locale, RecentSearchItem } from '@open-food/shared';
import { PrismaService } from '../prisma/prisma.service.js';

const RECENT_SEARCH_LIMIT = 10;

@Injectable()
export class RecentSearchesService {
  constructor(private readonly prisma: PrismaService) {}

  async record(userId: string, query: string, locale: Locale): Promise<void> {
    await this.prisma.recentSearch.create({ data: { userId, query, locale } });
  }

  async list(userId: string): Promise<RecentSearchItem[]> {
    const rows = await this.prisma.recentSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: RECENT_SEARCH_LIMIT,
    });

    return rows.map((row) => ({
      id: row.id,
      query: row.query,
      locale: row.locale,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
