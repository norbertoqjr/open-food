import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DEMO_USER_ID } from '@open-food/shared';
import { PrismaService } from '../prisma/prisma.service.js';

// Open Food has exactly one demo user; every request acts as this user.
// Nothing here ever accepts a user ID supplied by a client.
@Injectable()
export class DemoUserService {
  constructor(private readonly prisma: PrismaService) {}

  async getDemoUser() {
    const demoUser = await this.prisma.user.findUnique({ where: { id: DEMO_USER_ID } });

    if (!demoUser) {
      throw new InternalServerErrorException(
        'Demo user is missing; run the database seed (npm run prisma:seed).',
      );
    }

    return demoUser;
  }
}
