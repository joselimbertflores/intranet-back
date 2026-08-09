import { Controller, Get, Logger, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { EnvironmentVariables } from 'src/config';
import {
  getAuthCookieOptions,
  OAUTH_TRANSACTION_COOKIE_NAME,
  OAUTH_TRANSACTION_COOKIE_PATH,
  SESSION_COOKIE_NAME,
} from '../auth-cookies';
import { AuthCallbackParamsDto } from '../dtos/auth-callback-params.dto';
import { OAuthService } from '../services/oauth.service';
import { AuthSessionService } from '../services/auth-session.service';
import { IdentityHubTokenRequestError, IdentityHubUnavailableError } from '../services/auth-identity.service';
import { OAUTH_TRANSACTION_TTL_MS, OAuthTransactionService } from '../services/oauth-transaction.service';
import { AccessTokenFailureReason, AccessTokenVerificationError } from '../services/token-verifier.service';
import { Public } from '../decorators';

@Controller('auth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);
  private readonly secureCookies: boolean;
  private readonly cookieSameSite: EnvironmentVariables['AUTH_COOKIE_SAME_SITE'];

  constructor(
    private readonly oauthService: OAuthService,
    private readonly authSessionService: AuthSessionService,
    private readonly oauthTransactionService: OAuthTransactionService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {
    this.secureCookies = configService.getOrThrow('AUTH_COOKIE_SECURE', { infer: true });
    this.cookieSameSite = configService.getOrThrow('AUTH_COOKIE_SAME_SITE', { infer: true });
  }

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
    const transactionId = request.cookies?.[OAUTH_TRANSACTION_COOKIE_NAME] as string | undefined;
    if (!transactionId || !queryParams.state) {
      if (transactionId) await this.oauthTransactionService.discard(transactionId);
      return this.redirectToError(response, 'invalid_state');
    }

    const codeVerifier = await this.oauthTransactionService.consume(transactionId, queryParams.state);

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
      const previousSessionId = request.cookies?.[SESSION_COOKIE_NAME] as string | undefined;

      if (previousSessionId && previousSessionId !== session.id) {
        await this.authSessionService.deleteSession(previousSessionId);
      }

      response.cookie(SESSION_COOKIE_NAME, session.id, {
        ...getAuthCookieOptions(this.secureCookies, this.cookieSameSite),
        expires: session.refreshTokenExpiresAt,
      });
      this.clearOAuthTransactionCookie(response);

      return response.redirect(this.buildFrontendUrl('admin'));
    } catch (error: unknown) {
      this.logger.error(
        'OAuth callback failed during token exchange or user synchronization',
        error instanceof Error ? error.name : 'Unknown error',
      );

      if (error instanceof IdentityHubTokenRequestError && error.oauthError === 'invalid_grant') {
        const previousSessionId = request.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
        if (previousSessionId) await this.authSessionService.deleteSession(previousSessionId);
        response.clearCookie(SESSION_COOKIE_NAME, getAuthCookieOptions(this.secureCookies, this.cookieSameSite));
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
    this.clearOAuthTransactionCookie(response);
    return response.redirect(this.buildFrontendUrl('auth/error', { error }));
  }

  private async startAuthorization(response: Response) {
    const { url, transactionId } = await this.oauthService.createAuthorizationRequest();
    response.cookie(OAUTH_TRANSACTION_COOKIE_NAME, transactionId, {
      ...getAuthCookieOptions(this.secureCookies, this.cookieSameSite, OAUTH_TRANSACTION_COOKIE_PATH),
      maxAge: OAUTH_TRANSACTION_TTL_MS,
    });
    return response.redirect(url);
  }

  private clearOAuthTransactionCookie(response: Response): void {
    response.clearCookie(
      OAUTH_TRANSACTION_COOKIE_NAME,
      getAuthCookieOptions(this.secureCookies, this.cookieSameSite, OAUTH_TRANSACTION_COOKIE_PATH),
    );
  }

  private buildFrontendUrl(path: string, params?: Record<string, string | undefined>): string {
    const uiBaseUrl = this.configService.get('INTRANET_UI_URL', { infer: true });

    if (!uiBaseUrl) {
      const searchParams = new URLSearchParams();

      for (const [key, value] of Object.entries(params ?? {})) {
        if (value) searchParams.set(key, value);
      }

      const queryString = searchParams.toString();
      return queryString ? `/${path}?${queryString}` : `/${path}`;
    }

    const url = new URL(path, this.ensureTrailingSlash(uiBaseUrl));

    for (const [key, value] of Object.entries(params ?? {})) {
      if (value) url.searchParams.set(key, value);
    }

    return url.toString();
  }

  private ensureTrailingSlash(value: string): string {
    return value.endsWith('/') ? value : `${value}/`;
  }
}
