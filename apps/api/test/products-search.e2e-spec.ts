import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { OpenFoodFactsService } from '../src/open-food-facts/open-food-facts.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// The real ZodValidationPipe, the real RecentSearchesService, and a real
// database connection (via the full AppModule + supertest over HTTP) — only
// Open Food Facts itself is overridden, since a real upstream call would
// make this test dependent on live external data and network access.
describe('GET /products/search (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const openFoodFactsMock = {
    search: vi.fn(),
    getProduct: vi.fn(),
    getNutrition: vi.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OpenFoodFactsService)
      .useValue(openFoodFactsMock)
      .compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a blank query with a translated-ready field error', async () => {
    await request(app.getHttpServer())
      .get('/products/search')
      .query({ query: '' })
      .expect(400)
      .expect((response) => {
        expect(response.body.errors.query).toBeDefined();
      });

    expect(openFoodFactsMock.search).not.toHaveBeenCalled();
  });

  it('rejects a locale outside the supported set', async () => {
    await request(app.getHttpServer())
      .get('/products/search')
      .query({ query: 'nutella', locale: 'xx' })
      .expect(400);
  });

  it('persists a successful search to recent-searches for the demo user', async () => {
    openFoodFactsMock.search.mockResolvedValueOnce({
      items: [{
        id: '123', name: 'Nutella', brand: 'Ferrero', imageUrl: null,
      }],
      total: 1,
    });
    const marker = `e2e-test-${Date.now()}`;

    await request(app.getHttpServer())
      .get('/products/search')
      .query({ query: marker, locale: 'fr' })
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toHaveLength(1);
        expect(response.body.total).toBe(1);
      });

    const recentSearches = await request(app.getHttpServer())
      .get('/recent-searches')
      .expect(200);

    const persisted = recentSearches.body.find((entry: { query: string }) => (
      entry.query === marker
    ));
    expect(persisted).toMatchObject({ query: marker, locale: 'fr' });

    await prisma.recentSearch.deleteMany({ where: { query: marker } });
  });

  it('records a search even when it finds zero results', async () => {
    openFoodFactsMock.search.mockResolvedValueOnce({ items: [], total: 0 });
    const marker = `e2e-empty-${Date.now()}`;

    await request(app.getHttpServer())
      .get('/products/search')
      .query({ query: marker })
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toEqual([]);
      });

    const recentSearches = await request(app.getHttpServer())
      .get('/recent-searches')
      .expect(200);

    expect(recentSearches.body.some((entry: { query: string }) => entry.query === marker))
      .toBe(true);

    await prisma.recentSearch.deleteMany({ where: { query: marker } });
  });
});
