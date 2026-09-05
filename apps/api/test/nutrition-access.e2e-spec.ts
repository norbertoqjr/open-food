import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DEMO_USER_ID } from '@open-food/shared';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { OpenFoodFactsService } from '../src/open-food-facts/open-food-facts.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Nutrition access control (e2e)', () => {
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
    await prisma.subscription.deleteMany({ where: { userId: DEMO_USER_ID } });
    await app.close();
  });

  beforeEach(async () => {
    await prisma.subscription.deleteMany({ where: { userId: DEMO_USER_ID } });
    openFoodFactsMock.getProduct.mockReset();
    openFoodFactsMock.getNutrition.mockReset();
  });

  it('never includes nutrition in the public product-detail payload', async () => {
    openFoodFactsMock.getProduct.mockResolvedValueOnce({
      id: '123', name: 'Nutella', brand: 'Ferrero', imageUrl: null,
    });

    const response = await request(app.getHttpServer())
      .get('/products/123')
      .expect(200);

    expect(response.body).toEqual({
      id: '123', name: 'Nutella', brand: 'Ferrero', imageUrl: null,
    });
    expect(response.body.nutriments).toBeUndefined();
    expect(response.body.nutrition).toBeUndefined();
  });

  it('rejects a direct nutrition request with no active subscription', async () => {
    await request(app.getHttpServer())
      .get('/products/123/nutrition')
      .expect(403);

    expect(openFoodFactsMock.getNutrition).not.toHaveBeenCalled();
  });

  it('rejects nutrition for a canceled subscription', async () => {
    await prisma.subscription.create({
      data: {
        userId: DEMO_USER_ID,
        stripeSubscriptionId: `sub_test_${Date.now()}`,
        stripePriceId: 'price_test',
        status: 'canceled',
        lastEventAt: new Date(),
      },
    });

    await request(app.getHttpServer())
      .get('/products/123/nutrition')
      .expect(403);
  });

  it('allows nutrition through for an active subscription', async () => {
    await prisma.subscription.create({
      data: {
        userId: DEMO_USER_ID,
        stripeSubscriptionId: `sub_test_${Date.now()}`,
        stripePriceId: 'price_test',
        status: 'active',
        lastEventAt: new Date(),
      },
    });
    openFoodFactsMock.getNutrition.mockResolvedValueOnce({
      basis: '100g',
      energyKcal: 539,
      fat: 30.9,
      saturatedFat: 10.6,
      carbohydrates: 57.5,
      sugars: 56.3,
      fiber: null,
      proteins: 6.3,
      salt: 0.107,
    });

    const response = await request(app.getHttpServer())
      .get('/products/123/nutrition')
      .expect(200);

    expect(response.body.energyKcal).toBe(539);
    expect(response.headers['cache-control']).toBe('private, no-store');
  });
});
