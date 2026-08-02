import { Controller, Get, Post, Req, Res } from '@nestjs/common';

import type { Request, Response } from 'express';

import { User } from 'src/modules/users/entities';
import { GetAuthUser, Public } from '../decorators';
import { CurrentUserResponseDto } from '../dtos';
import { AuthCookieService, AuthSessionService } from '../services';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authCookieService: AuthCookieService,
    private readonly authSessionService: AuthSessionService,
  ) {}

  @Get('me')
  getMe(@GetAuthUser() user: User): CurrentUserResponseDto {
    return {
      user: {
        id: user.id,
        externalKey: user.externalKey,
        fullName: user.fullName,
        permissions: this.getEffectivePermissions(user),
      },
    };
  }

  private getEffectivePermissions(user: User): string[] {
    const permissions = (user.roles ?? []).flatMap((role) =>
      (role.permissions ?? []).map((permission) => `${permission.resource}:${permission.action}`),
    );

    return [...new Set(permissions)].sort();
  }

  @Public()
  @Post('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const sessionId = this.authCookieService.getSessionId(request);

    this.authCookieService.clearSessionCookies(response);

    if (sessionId) {
      await this.authSessionService.deleteSession(sessionId);
    }

    return {
      ok: true,
      message: 'Logged out from this system',
    };
  }
}
