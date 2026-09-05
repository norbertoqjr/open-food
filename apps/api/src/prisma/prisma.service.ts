import {
  Injectable, Logger, OnModuleDestroy, OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import type { ApiEnv } from '@open-food/shared';
import { PrismaClient } from '../generated/prisma/client.js';

// Single PrismaClient for the whole process, connected once at boot and
// disconnected on shutdown, rather than one per request.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService<ApiEnv, true>) {
    super({ adapter: new PrismaMariaDb(configService.get('DATABASE_URL', { infer: true })) });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to the database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
