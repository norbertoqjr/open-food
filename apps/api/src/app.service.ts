import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  // Instance method (not static) to stay consistent with how Nest injects
  // and calls every other service in this codebase.
  // eslint-disable-next-line class-methods-use-this
  getHello(): string {
    return 'Hello World!';
  }
}
