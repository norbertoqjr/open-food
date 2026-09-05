import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('AppController (e2e)', () => {
  // supertest@7 ships no `types` subpath; under this project's nodenext
  // module resolution, @types/supertest cannot fill that gap the way
  // classic resolution would, so the app type here is left uninferred.
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => request(app.getHttpServer())
    .get('/')
    .expect(200)
    .expect('Hello World!'));

  afterEach(async () => {
    await app.close();
  });
});
