import { Controller, Get, Logger, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthCallbackParamsDto } from '../dtos';
import { AuthCookieService } from '../services/auth-cookie.service';
import { AuthRedirectService } from '../services/auth-redirect.service';
import { OAuthService } from '../services/oauth.service';
import { AuthSessionService, IdentityHubTokenRequestError, IdentityHubUnavailableError } from '../services';
import { AccessTokenFailureReason, AccessTokenVerificationError } from '../services/token-verifier.service';
import { Public } from '../decorators';

@Controller('auth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(
    private readonly oauthService: OAuthService,
    private readonly authCookieService: AuthCookieService,
    private readonly authRedirectService: AuthRedirectService,
    private readonly authSessionService: AuthSessionService,
  ) {}

  @Get('login')
  @Public()
  async login(@Res() response: Response) {
    return this.startAuthorization(response);
  }

  @Get('callback')
  @Public()
  async callback(
    @Req() request: Request,
    @Query() queryParams: AuthCallbackParamsDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const transactionId = this.authCookieService.getOAuthTransactionId(request);
    if (!transactionId || !queryParams.state) {
      if (transactionId) await this.oauthService.discardAuthorizationRequest(transactionId);
      return this.redirectToError(response, 'invalid_state');
    }

    const codeVerifier = await this.oauthService.consumeAuthorizationRequest(transactionId, queryParams.state);
    this.authCookieService.clearOAuthTransactionCookie(response);

    if (!codeVerifier) return this.redirectToError(response, 'invalid_state');

    if (queryParams.error) {
      const error = queryParams.error === 'access_denied' ? 'access_denied' : 'authorization_failed';
      return this.redirectToError(response, error);
    }

    if (!queryParams.code) {
      return this.redirectToError(response, 'missing_code');
    }

    try {
      const session = await this.oauthService.completeAuthorizationCodeFlow(queryParams.code, codeVerifier);
      const previousSessionId = this.authCookieService.getSessionId(request);

      if (previousSessionId && previousSessionId !== session.id) {
        await this.authSessionService.deleteSession(previousSessionId);
      }

      this.authCookieService.setSessionCookie(response, session.id, session.refreshTokenExpiresAt);

      return response.redirect(this.authRedirectService.buildSuccessRedirectUrl());
    } catch (error: unknown) {
      this.logger.error(
        'OAuth callback failed during token exchange or user synchronization',
        error instanceof Error ? error.name : 'Unknown error',
      );

      if (error instanceof IdentityHubTokenRequestError && error.oauthError === 'invalid_grant') {
        const previousSessionId = this.authCookieService.getSessionId(request);
        if (previousSessionId) await this.authSessionService.deleteSession(previousSessionId);
        this.authCookieService.clearSessionCookie(response);
        return this.startAuthorization(response);
      }

      if (
        error instanceof IdentityHubUnavailableError ||
        (error instanceof AccessTokenVerificationError && error.reason === AccessTokenFailureReason.VERIFICATION_FAILED)
      ) {
        return this.redirectToError(response, 'identity_hub_unavailable');
      }

      return this.redirectToError(response, 'token_exchange_failed');
    }
  }

  private redirectToError(response: Response, error: string) {
    this.authCookieService.clearOAuthTransactionCookie(response);
    return response.redirect(this.authRedirectService.buildErrorRedirectUrl(error));
  }

  private async startAuthorization(response: Response) {
    const { url, transactionId } = await this.oauthService.createAuthorizationRequest();
    this.authCookieService.setOAuthTransactionCookie(response, transactionId);
    return response.redirect(url);
  }
}
