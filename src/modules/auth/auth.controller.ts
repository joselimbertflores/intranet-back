import { Controller, Get, Query, Res, Req } from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthCallbackParamsDto } from './dtos';
import { AuthService } from './auth.service';
import { Public } from './decorators';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('login')
  @Public()
  login(@Res() response: Response) {
    const authorizeUrl = this.authService.buildAuthorizeUrl();
    return response.redirect(authorizeUrl);
  }

  @Get('callback')
  @Public()
  async callback(@Query() queryParams: AuthCallbackParamsDto, @Res({ passthrough: true }) res: Response) {
    const { result, url } = await this.authService.exchangeAuthorizationCode(queryParams.code);
    res.cookie('intranet_access', result.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('intranet_refresh', result.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return res.redirect(url);
  }

  @Get('status')
  checkAuthStatus(@Req() req: Request) {
    return { ok: true, user: req['user'] };
  }
}
