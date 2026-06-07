import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { CookieOptions, Request, Response } from 'express';

import { EnvironmentVariables } from 'src/config';
import { TokenRequestResponse } from '../interfaces';

@Injectable()
export class AuthCookieService {
  private readonly accessCookieName = 'intranet_access';
  private readonly refreshCookieName = 'intranet_refresh';
  private readonly stateCookieName = 'intranet_oauth_state';
  private readonly oauthStateMaxAgeMs = 5 * 60 * 1000;

  constructor(private readonly configService: ConfigService<EnvironmentVariables>) {}

  setOAuthStateCookie(response: Response, state: string) {
    response.cookie(this.stateCookieName, state, this.getCookieOptions(this.oauthStateMaxAgeMs));
  }

  clearOAuthStateCookie(response: Response) {
    response.clearCookie(this.stateCookieName, this.getBaseCookieOptions());
  }

  setAuthCookies(response: Response, tokens: TokenRequestResponse) {
    const accessTokenExpiresInSeconds = tokens.accessTokenExpiresIn;
    const refreshTokenExpiresInSeconds = tokens.refreshTokenExpiresIn;

    response.cookie(this.accessCookieName, tokens.accessToken, {
      ...this.getCookieOptionsFromExpiresInSeconds(accessTokenExpiresInSeconds),
    });

    response.cookie(this.refreshCookieName, tokens.refreshToken, {
      ...this.getCookieOptionsFromExpiresInSeconds(refreshTokenExpiresInSeconds),
    });
  }

  clearAuthCookies(response: Response) {
    response.clearCookie(this.accessCookieName, this.getBaseCookieOptions());
    response.clearCookie(this.refreshCookieName, this.getBaseCookieOptions());
  }

  clearSessionCookies(response: Response): void {
    this.clearAuthCookies(response);
    this.clearOAuthStateCookie(response);
  }

  getAccessToken(request: Request): string | undefined {
    return request.cookies[this.accessCookieName] as string | undefined;
  }

  getRefreshToken(request: Request): string | undefined {
    return request.cookies[this.refreshCookieName] as string | undefined;
  }

  getOAuthState(request: Request): string | undefined {
    return request.cookies[this.stateCookieName] as string | undefined;
  }

  private getBaseCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: this.getSameSite(),
      secure: this.configService.getOrThrow<boolean>('AUTH_COOKIE_SECURE'),
      path: '/',
    };
  }

  private getCookieOptions(maxAgeMs: number): CookieOptions {
    return {
      ...this.getBaseCookieOptions(),
      maxAge: maxAgeMs,
    };
  }

  private getCookieOptionsFromExpiresInSeconds(expiresInSeconds: number): CookieOptions {
    const maxAgeMs = expiresInSeconds * 1000;
    return this.getCookieOptions(maxAgeMs);
  }

  private getSameSite(): CookieOptions['sameSite'] {
    return this.configService.get<'lax' | 'strict' | 'none'>('AUTH_COOKIE_SAME_SITE', 'lax');
  }
}
