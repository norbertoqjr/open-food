import { Injectable } from '@nestjs/common';
import type { Locale, RecentSearchItem } from '@open-food/shared';
import { PrismaService } from '../prisma/prisma.service.js';

const RECENT_SEARCH_LIMIT = 10;

@Injectable()
export class RecentSearchesService {
  constructor(private readonly prisma: PrismaService) {}

  // Repeating the search you just ran bumps the existing row instead of
  // adding another. Without this the list fills with consecutive duplicates:
  // React's development double-invoked effects issue every search twice, and
  // a re-search after a language change or a reload is not new history.
  // Non-consecutive repeats are still recorded, so a -> b -> a keeps both.
  async record(userId: string, query: string, locale: Locale): Promise<void> {
    const [latest] = await this.prisma.recentSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (latest?.query === query && latest.locale === locale) {
      await this.prisma.recentSearch.update({
        where: { id: latest.id },
        data: { createdAt: new Date() },
      });
      return;
    }

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
