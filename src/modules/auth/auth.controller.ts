import { Controller, Get, Post, Query, Res, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthGuard } from './guards/auth/auth.guard';
import { AuthCallbackParamsDto } from './dtos';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('login')
  login(@Res() response: Response) {
    const authorizeUrl = this.authService.buildAuthorizeUrl();
    return response.redirect(authorizeUrl);
  }

  @Get('callback')
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
  @UseGuards(AuthGuard)
  checkAuthStatus(@Req() req: Request) {
    return { ok: true, user: req['user'] };
  }

  @Post('refresh')
  async refresh(@Req() request: Request, @Res() response: Response) {
    console.log('REFRESH INICIADO');
    const refreshToken = request.cookies?.['refresh_token'] as string | undefined;

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    const tokens = await this.authService.refreshToken(refreshToken);
    response.cookie('intranet_access', tokens.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 15 * 60 * 1000,
    });

    response.cookie('intranet_refresh', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return response.json({ success: true });
  }
}
