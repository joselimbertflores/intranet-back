import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { CookieOptions, Request, Response } from 'express';

import { EnvironmentVariables } from 'src/config';

@Injectable()
export class AuthCookieService {
  private readonly sessionCookieName = 'intranet_session';
  private readonly oauthTransactionCookieName = 'intranet_oauth_transaction';
  private readonly oauthTransactionMaxAgeMs = 5 * 60 * 1000;

  constructor(private readonly configService: ConfigService<EnvironmentVariables>) {}

  setOAuthTransactionCookie(response: Response, transactionId: string): void {
    response.cookie(this.oauthTransactionCookieName, transactionId, this.getOAuthTransactionCookieOptions());
  }

  clearOAuthTransactionCookie(response: Response): void {
    response.clearCookie(this.oauthTransactionCookieName, this.getOAuthTransactionBaseCookieOptions());
  }

  setSessionCookie(response: Response, sessionId: string, expiresAt: Date): void {
    response.cookie(this.sessionCookieName, sessionId, this.getCookieOptions(expiresAt));
  }

  clearSessionCookie(response: Response): void {
    response.clearCookie(this.sessionCookieName, this.getBaseCookieOptions());
  }

  clearSessionCookies(response: Response): void {
    this.clearSessionCookie(response);
    this.clearOAuthTransactionCookie(response);
  }

  getSessionId(request: Request): string | undefined {
    return request.cookies?.[this.sessionCookieName] as string | undefined;
  }

  getOAuthTransactionId(request: Request): string | undefined {
    return request.cookies?.[this.oauthTransactionCookieName] as string | undefined;
  }

  private getBaseCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: this.getSameSite(),
      secure: this.getSecure(),
      path: '/',
    };
  }

  private getOAuthTransactionBaseCookieOptions(): CookieOptions {
    return {
      ...this.getBaseCookieOptions(),
      path: '/auth',
    };
  }

  private getOAuthTransactionCookieOptions(): CookieOptions {
    return {
      ...this.getOAuthTransactionBaseCookieOptions(),
      maxAge: this.oauthTransactionMaxAgeMs,
    };
  }

  private getCookieOptions(expiresAt: Date): CookieOptions {
    return {
      ...this.getBaseCookieOptions(),
      expires: expiresAt,
    };
  }

  private getSameSite(): CookieOptions['sameSite'] {
    return this.configService.get<'lax' | 'strict' | 'none'>('AUTH_COOKIE_SAME_SITE', 'lax');
  }

  private getSecure(): boolean {
    return this.configService.get<boolean>('AUTH_COOKIE_SECURE', false);
  }
}
