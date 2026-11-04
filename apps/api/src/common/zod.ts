import { ArgumentMetadata, BadRequestException, PipeTransform, applyDecorators, Body, Query } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { z, ZodType } from 'zod';

export class ZodPipe<T extends ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}
  transform(value: unknown, _meta: ArgumentMetadata): z.infer<T> {
    const result = this.schema.safeParse(value ?? {});
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    return result.data;
  }
}

/** Validated request body parameter. */
export const ZBody = <T extends ZodType>(schema: T) => Body(new ZodPipe(schema));
/** Validated query parameters. */
export const ZQuery = <T extends ZodType>(schema: T) => Query(new ZodPipe(schema));

/** Documents a zod body schema in OpenAPI. */
export function ApiZodBody(schema: ZodType) {
  let jsonSchema: Record<string, unknown> = { type: 'object' };
  try {
    jsonSchema = z.toJSONSchema(schema, { unrepresentable: 'any', io: 'input' }) as Record<string, unknown>;
    delete jsonSchema.$schema;
  } catch {
    /* fall back to generic object */
  }
  return applyDecorators(ApiBody({ schema: jsonSchema as never }));
}
