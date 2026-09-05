import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { ApiEnv } from '@open-food/shared';
import { AppModule } from './app.module.js';

async function bootstrap() {
  // rawBody is required for Stripe webhook signature verification, which
  // must hash the exact bytes Stripe sent, not a re-serialized JSON body.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  const configService = app.get<ConfigService<ApiEnv, true>>(ConfigService);

  app.enableCors({ origin: configService.get('WEB_ORIGIN', { infer: true }) });

  await app.listen(configService.get('PORT', { infer: true }));
}

await bootstrap();
