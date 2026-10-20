import { Body, Controller, Get, Patch } from '@nestjs/common';
import type { UserPreferencesResponse } from '@moneyflow/contracts';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators';
import { PreferencesService } from './preferences.service';

/**
 * `/api/v1/preferences` — the authenticated user's display/reporting
 * preferences (IT-11, requirements.md §5.2/§8.6). Protected by the global
 * `AuthGuard`; identity always comes from the verified session and a
 * client-supplied `userId` is never read.
 */
@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferences: PreferencesService) {}

  @Get()
  public getPreferences(@CurrentUser() user: AuthUser): Promise<UserPreferencesResponse> {
    return this.preferences.getPreferences(user.id);
  }

  @Patch()
  public updatePreferences(
    @CurrentUser() user: AuthUser,
    @Body() body: unknown,
  ): Promise<UserPreferencesResponse> {
    return this.preferences.updatePreferences(user.id, body);
  }
}
