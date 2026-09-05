import { Module } from '@nestjs/common';
import { DemoUserService } from './demo-user.service.js';

@Module({
  providers: [DemoUserService],
  exports: [DemoUserService],
})
export class UsersModule {}
