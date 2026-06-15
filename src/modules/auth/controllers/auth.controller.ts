import { Controller, Get, Post, Res } from '@nestjs/common';

import type { Response } from 'express';

import { User } from 'src/modules/users/entities';
import { GetAuthUser, Public } from '../decorators';
import { CurrentUserResponseDto } from '../dtos';
import { AuthCookieService } from '../services';

@Controller('auth')
export class AuthController {
  constructor(private readonly authCookieService: AuthCookieService) {}

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
  logout(@Res({ passthrough: true }) res: Response) {
    this.authCookieService.clearSessionCookies(res);

    return {
      ok: true,
      message: 'Logged out from this system',
    };
  }
}
