import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, Logger } from '@nestjs/common';
import type { ApiErrorResponse } from '@moneyflow/contracts';

/**
 * Maps every Nest-handled error to the API error contract
 * (requirements.md §8.5): `{ message }` with a safe, human-readable string.
 * Stack traces, SQL details, and secrets never reach the client; unexpected
 * errors are logged server-side and answered with a generic 500.
 *
 * Better Auth's own endpoints are mounted outside Nest routing and use the
 * library's compatible `{ message, code? }` envelope
 * (docs/architecture/auth-sessions.md).
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  public catch(error: unknown, host: ArgumentsHost): void {
    const { status, body } = toApiErrorResponse(error);

    if (status >= 500 && !(error instanceof HttpException)) {
      // Unexpected failure: keep the stack server-side for diagnosis. No
      // request headers, cookies, or body content are logged.
      this.logger.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    }

    const response = host
      .switchToHttp()
      .getResponse<{ status(code: number): { json(payload: ApiErrorResponse): void } }>();
    response.status(status).json(body);
  }
}

/** Pure mapping used by the filter and unit tests. */
export function toApiErrorResponse(error: unknown): {
  status: number;
  body: ApiErrorResponse;
} {
  if (error instanceof HttpException) {
    const status = error.getStatus();
    return { status, body: { message: extractMessage(error) } };
  }
  return { status: 500, body: { message: 'Internal server error.' } };
}

function extractMessage(error: HttpException): string {
  const response = error.getResponse();
  if (typeof response === 'string') {
    return response;
  }
  const message = (response as { message?: unknown }).message;
  if (typeof message === 'string') {
    return message;
  }
  // Nest's default validation errors carry a string array; join for the
  // contract's single message field.
  if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
    return message.join(' ');
  }
  return error.message;
}
