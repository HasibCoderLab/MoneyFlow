import type { ArgumentsHost } from '@nestjs/common';
import {
  BadRequestException,
  HttpException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { ApiExceptionFilter, toApiErrorResponse } from './api-exception.filter';

describe('toApiErrorResponse', () => {
  it('maps HttpExceptions to their status and safe message', () => {
    expect(toApiErrorResponse(new UnauthorizedException('Authentication required.'))).toEqual({
      status: 401,
      body: { message: 'Authentication required.' },
    });
  });

  it('uses the default message for parameterless Nest exceptions', () => {
    expect(toApiErrorResponse(new NotFoundException())).toEqual({
      status: 404,
      body: { message: 'Not Found' },
    });
  });

  it('joins array messages from Nest validation responses', () => {
    const response = toApiErrorResponse(new BadRequestException(['a is wrong', 'b is wrong']));
    expect(response.body.message).toBe('a is wrong b is wrong');
  });

  it('never leaks unexpected error details to the client', () => {
    const response = toApiErrorResponse(
      new Error('connection postgres://user:password@host failed'),
    );

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Internal server error.' });
    expect(JSON.stringify(response.body)).not.toContain('password');
  });
});

describe('ApiExceptionFilter', () => {
  function fakeHost(): {
    host: ArgumentsHost;
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  } {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
    return { host, status, json };
  }

  it('writes the mapped payload with the mapped status', () => {
    const { host, status, json } = fakeHost();

    new ApiExceptionFilter().catch(new UnauthorizedException('Authentication required.'), host);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Authentication required.' });
  });

  it('logs unexpected errors server-side but answers generically', () => {
    const logSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { host, json } = fakeHost();

    new ApiExceptionFilter().catch(new Error('secret detail'), host);

    expect(logSpy).toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ message: 'Internal server error.' });
    expect(JSON.stringify(json.mock.calls)).not.toContain('secret detail');
  });

  it('does not log client-caused HttpExceptions', () => {
    const logSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { host } = fakeHost();

    new ApiExceptionFilter().catch(new HttpException('Teapot', 418), host);

    expect(logSpy).not.toHaveBeenCalled();
  });
});
