import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { DemoUserService } from '../src/users/demo-user.service.js';
import { SubscriptionsService } from '../src/subscriptions/subscriptions.service.js';

describe('GET /me', () => {
  let app: INestApplication;

  const demoUserMock = { getDemoUser: vi.fn() };
  const subscriptionsMock = { getStatus: vi.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DemoUserService)
      .useValue(demoUserMock)
      .overrideProvider(SubscriptionsService)
      .useValue(subscriptionsMock)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    demoUserMock.getDemoUser.mockReset();
    subscriptionsMock.getStatus.mockReset();
  });

  it('returns the demo user with its subscription', async () => {
    demoUserMock.getDemoUser.mockResolvedValueOnce({
      id: 'demo-user',
      createdAt: new Date('2026-01-02T03:04:05.000Z'),
    });
    subscriptionsMock.getStatus.mockResolvedValueOnce({
      active: true,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: '2026-10-01T00:00:00.000Z',
    });

    const response = await request(app.getHttpServer()).get('/me').expect(200);

    expect(response.body).toEqual({
      id: 'demo-user',
      memberSince: '2026-01-02T03:04:05.000Z',
      subscription: {
        active: true,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: '2026-10-01T00:00:00.000Z',
      },
    });
    // The status is always read for the resolved demo user, never for an
    // id the caller could influence.
    expect(subscriptionsMock.getStatus).toHaveBeenCalledWith('demo-user');
  });

  it('reports free plan when there is no subscription', async () => {
    demoUserMock.getDemoUser.mockResolvedValueOnce({
      id: 'demo-user',
      createdAt: new Date('2026-01-02T03:04:05.000Z'),
    });
    subscriptionsMock.getStatus.mockResolvedValueOnce({
      active: false,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    });

    const response = await request(app.getHttpServer()).get('/me').expect(200);

    expect(response.body.subscription.active).toBe(false);
  });
});
