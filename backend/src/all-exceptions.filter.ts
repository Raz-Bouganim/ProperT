import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

function httpExceptionMessage(exception: HttpException): string | string[] {
  const res = exception.getResponse();
  if (typeof res === 'string') {
    return res;
  }
  if (typeof res === 'object' && res !== null && 'message' in res) {
    const msg = (res as { message: unknown }).message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return msg as string[];
  }
  return exception.message;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // In certain situations `httpAdapter` might not be available in the
    // constructor method, thus we should resolve it here.
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: String(httpAdapter.getRequestUrl(ctx.getRequest())),
      message:
        exception instanceof HttpException
          ? httpExceptionMessage(exception)
          : 'Internal server error',
    };

    if (httpStatus === 500) {
      this.logger.error(exception);
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
