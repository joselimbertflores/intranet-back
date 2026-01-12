import { Controller, Get, Query, Res, Req } from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthCallbackParamsDto } from '../dtos';
import { OAuthuthService } from '../services';
import { Public } from '../decorators';

@Controller('auth')
export class OAuthController {
  constructor(private oAuthService: OAuthuthService) {}

  @Get('login')
  @Public()
  login(@Res() response: Response) {
    const authorizeUrl = this.oAuthService.buildAuthorizeUrl();
    return response.redirect(authorizeUrl);
  }

  @Get('callback')
  @Public()
  async callback(@Query() queryParams: AuthCallbackParamsDto, @Res({ passthrough: true }) res: Response) {
    const { result, url } = await this.oAuthService.exchangeAuthorizationCode(queryParams.code);

    res.cookie('intranet_access', result.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: result.accessTokenExpiresIn * 1000,
    });

    res.cookie('intranet_refresh', result.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: result.refreshTokenExpiresIn * 1000,
    });
    return res.redirect(url);
  }
}
