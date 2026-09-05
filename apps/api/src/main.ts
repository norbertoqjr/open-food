import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { ApiEnv } from '@open-food/shared';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService<ApiEnv, true>>(ConfigService);

  app.enableCors({ origin: configService.get('WEB_ORIGIN', { infer: true }) });

  await app.listen(configService.get('PORT', { infer: true }));
}

await bootstrap();
