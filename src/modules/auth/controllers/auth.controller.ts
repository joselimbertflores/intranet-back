import { Controller, Get, Post, Res } from '@nestjs/common';

import type { Response } from 'express';

import { User } from 'src/modules/users/entities';
import { GetAuthUser, Public } from '../decorators';
import { AuthCookieService } from '../services';

@Controller('auth')
export class AuthController {
  constructor(private readonly authCookieService: AuthCookieService) {}

  @Get('me')
  getMe(@GetAuthUser() user: User) {
    return {
      user: {
        id: user.id,
        externalKey: user.externalKey,
        fullName: user.fullName,
        isActive: user.isActive,
        roles: (user.roles ?? []).map((role) => ({
          id: role.id,
          name: role.name,
          description: role.description,
          permissions: (role.permissions ?? []).map((permission) => ({
            id: permission.id,
            resource: permission.resource,
            action: permission.action,
          })),
        })),
      },
    };
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
