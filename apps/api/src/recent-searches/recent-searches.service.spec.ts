import { RecentSearchesService } from './recent-searches.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function buildService(latest: { id: string; query: string; locale: string } | null) {
  const findMany = vi.fn().mockResolvedValue(latest ? [latest] : []);
  const create = vi.fn().mockResolvedValue({});
  const update = vi.fn().mockResolvedValue({});
  const prisma = { recentSearch: { findMany, create, update } } as unknown as PrismaService;

  return {
    service: new RecentSearchesService(prisma), findMany, create, update,
  };
}

describe('RecentSearchesService.record', () => {
  it('records a search when there is no history', async () => {
    const { service, create, update } = buildService(null);

    await service.record('demo-user', 'nutella', 'en');

    expect(create).toHaveBeenCalledWith({
      data: { userId: 'demo-user', query: 'nutella', locale: 'en' },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('bumps rather than duplicates an immediate repeat', async () => {
    const { service, create, update } = buildService({ id: 'r1', query: 'nutella', locale: 'en' });

    await service.record('demo-user', 'nutella', 'en');

    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { createdAt: expect.any(Date) },
    });
  });

  it('records the same query again in a different locale', async () => {
    const { service, create } = buildService({ id: 'r1', query: 'nutella', locale: 'en' });

    await service.record('demo-user', 'nutella', 'fr');

    expect(create).toHaveBeenCalled();
  });

  it('records a repeat that is not consecutive', async () => {
    const { service, create } = buildService({ id: 'r1', query: 'chocolate', locale: 'en' });

    await service.record('demo-user', 'nutella', 'en');

    expect(create).toHaveBeenCalled();
  });
});
