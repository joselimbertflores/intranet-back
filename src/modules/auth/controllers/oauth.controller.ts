import { Controller, Get, Logger, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthCallbackParamsDto } from '../dtos';
import { AuthCookieService } from '../services/auth-cookie.service';
import { AuthRedirectService } from '../services/auth-redirect.service';
import { OAuthService } from '../services/oauth.service';
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
    const { url, state, codeVerifier } = this.oauthService.createAuthorizationRequest();
    this.authCookieService.setOAuthTransactionCookies(response, state, codeVerifier);
    return response.redirect(url);
  }

  @Get('callback')
  @Public()
  async callback(
    @Req() request: Request,
    @Query() queryParams: AuthCallbackParamsDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!this.validateCallbackState(request, queryParams.state)) {
      return this.redirectToError(response, 'invalid_state');
    }

    const codeVerifier = this.authCookieService.getPkceVerifier(request);
    if (!codeVerifier) {
      return this.redirectToError(response, 'missing_code_verifier');
    }

    if (queryParams.error) {
      return this.redirectToError(response, queryParams.error);
    }

    if (!queryParams.code) {
      return this.redirectToError(response, 'missing_code');
    }

    try {
      const tokens = await this.oauthService.completeAuthorizationCodeFlow(queryParams.code, codeVerifier);
      this.clearOAuthTransaction(response);
      this.authCookieService.clearAuthCookies(response);
      this.authCookieService.setAuthCookies(response, tokens);

      return response.redirect(this.authRedirectService.buildSuccessRedirectUrl());
    } catch (error: unknown) {
      this.logger.error(
        'OAuth callback failed during token exchange or user synchronization',
        error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      );

      return this.redirectToError(response, 'token_exchange_failed');
    }
  }

  private redirectToError(response: Response, error: string) {
    this.clearOAuthTransaction(response);
    return response.redirect(this.authRedirectService.buildErrorRedirectUrl(error));
  }

  private validateCallbackState(request: Request, state?: string): boolean {
    const cookieState = this.authCookieService.getOAuthState(request);
    console.log(cookieState);
    return Boolean(state && state === cookieState);
  }

  private clearOAuthTransaction(response: Response): void {
    this.authCookieService.clearOAuthTransactionCookies(response);
  }
}
