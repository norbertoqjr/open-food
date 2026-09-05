import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import * as z from 'zod';

// Wraps a Zod schema as a Nest pipe: `@Query(new ZodValidationPipe(schema))`.
// Runs the same schema the frontend form already validated against, so a
// request that bypasses the form is rejected the same way a bad form
// submission is, with field-level errors rather than a generic 400.
@Injectable()
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: z.flattenError(result.error).fieldErrors,
      });
    }

    return result.data;
  }
}
