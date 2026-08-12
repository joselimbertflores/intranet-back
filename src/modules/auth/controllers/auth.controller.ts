import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Request, Response } from 'express';

import { EnvironmentVariables } from 'src/config';
import { User } from 'src/modules/users/entities';
import {
  getAuthCookieOptions,
  OAUTH_TRANSACTION_COOKIE_NAME,
  OAUTH_TRANSACTION_COOKIE_PATH,
  SESSION_COOKIE_NAME,
} from '../auth-cookies';
import { GetAuthUser, Public } from '../decorators';
import { CurrentUserResponseDto } from '../dtos/current-user-response.dto';
import { AuthSessionService } from '../services/auth-session.service';

@Controller('auth')
export class AuthController {
  private readonly secureCookies: boolean;
  private readonly cookieSameSite: EnvironmentVariables['AUTH_COOKIE_SAME_SITE'];

  constructor(
    private readonly authSessionService: AuthSessionService,
    configService: ConfigService<EnvironmentVariables, true>,
  ) {
    this.secureCookies = configService.getOrThrow('AUTH_COOKIE_SECURE', { infer: true });
    this.cookieSameSite = configService.getOrThrow('AUTH_COOKIE_SAME_SITE', { infer: true });
  }

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
    const sessionId = request.cookies?.[SESSION_COOKIE_NAME] as string | undefined;

    response.clearCookie(SESSION_COOKIE_NAME, getAuthCookieOptions(this.secureCookies, this.cookieSameSite));
    response.clearCookie(
      OAUTH_TRANSACTION_COOKIE_NAME,
      getAuthCookieOptions(this.secureCookies, this.cookieSameSite, OAUTH_TRANSACTION_COOKIE_PATH),
    );

    if (sessionId) {
      await this.authSessionService.deleteSession(sessionId);
    }

    return {
      ok: true,
      message: 'Logged out from this system',
    };
  }
}
