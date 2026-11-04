import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/** Consistent JSON errors; maps common Prisma errors; never leaks internals. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errors');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const payload = typeof body === 'string' ? { message: body } : body;
      return res.status(exception.getStatus()).json({ statusCode: exception.getStatus(), ...payload });
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') return res.status(409).json({ statusCode: 409, message: 'A record with these details already exists' });
      if (exception.code === 'P2025') return res.status(404).json({ statusCode: 404, message: 'Record not found' });
    }
    const msg = String((exception as Error)?.message ?? '');
    if (msg.includes('products_stock_non_negative')) return res.status(409).json({ statusCode: 409, message: 'Insufficient stock' });
    if (msg.includes('booking_slots_capacity_check')) return res.status(409).json({ statusCode: 409, message: 'Slot is fully booked' });
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ statusCode: 500, message: 'Something went wrong' });
  }
}
