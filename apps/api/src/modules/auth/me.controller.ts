import { Body, Controller, Get, Headers, Patch } from '@nestjs/common';
import type { MeResponse } from '@moneyflow/contracts';
import type { IncomingHttpHeaders } from 'node:http';

import { AuthService } from './auth.service';
import type { AuthUser } from './auth.types';
import { CurrentUser } from './decorators';

/**
 * `GET/PATCH /api/v1/me` — the caller's own identity and profile (IT-3
 * scope). Protected by the global `AuthGuard`; the user is always the one
 * resolved from the verified session.
 */
@Controller('me')
export class MeController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  public getMe(@CurrentUser() user: AuthUser): MeResponse {
    return this.authService.getMe(user);
  }

  @Patch()
  public async updateMe(
    @Headers() headers: IncomingHttpHeaders,
    @Body() body: unknown,
  ): Promise<MeResponse> {
    return this.authService.updateMe(headers, body);
  }
}
