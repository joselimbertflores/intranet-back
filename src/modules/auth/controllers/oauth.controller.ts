import { Controller, Get, Logger, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthCallbackParamsDto } from '../dtos';
import { AuthCookieService, AuthRedirectService, OAuthService } from '../services';
import { Public } from '../decorators';

@Controller('auth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(
    private readonly oauthService: OAuthService,
    private readonly authCookieService: AuthCookieService,
    private readonly authRedirectService: AuthRedirectService,
  ) {}

  @Get('login')
  @Public()
  login(@Res() response: Response) {
    const { url, state } = this.oauthService.buildAuthorizeUrl();
    this.authCookieService.setOAuthStateCookie(response, state);
    return response.redirect(url);
  }

  @Get('callback')
  @Public()
  async callback(
    @Req() request: Request,
    @Query() queryParams: AuthCallbackParamsDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (queryParams.error) {
      return this.redirectToError(response, queryParams.error);
    }

    if (!this.validateCallbackState(request, queryParams.state)) {
      return this.redirectToError(response, 'invalid_state');
    }

    if (!queryParams.code) {
      return this.redirectToError(response, 'missing_code');
    }

    try {
      const tokens = await this.oauthService.completeAuthorizationCodeFlow(queryParams.code);
      this.clearTemporaryOAuthState(response);
      this.authCookieService.clearAuthCookies(response);
      this.authCookieService.setAuthCookies(response, tokens);

      return response.redirect(this.authRedirectService.buildSuccessRedirectUrl());
    } catch (error: unknown) {
      this.logger.error(
        'OAuth callback failed during token exchange or user synchronization',
        error instanceof Error ? error.stack : String(error),
      );

      return this.redirectToError(response, 'token_exchange_failed');
    }
  }

  private redirectToError(response: Response, error: string) {
    this.clearTemporaryOAuthState(response);
    return response.redirect(this.authRedirectService.buildErrorRedirectUrl(error));
  }

  private validateCallbackState(request: Request, state?: string): boolean {
    const cookieState = this.authCookieService.getOAuthState(request);
    return Boolean(state && state === cookieState);
  }

  private clearTemporaryOAuthState(response: Response): void {
    this.authCookieService.clearOAuthStateCookie(response);
  }
}
