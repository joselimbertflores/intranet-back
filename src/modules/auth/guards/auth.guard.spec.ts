jest.mock('../services', () => {
  const { UnauthorizedException } = jest.requireActual<typeof import('@nestjs/common')>('@nestjs/common');

  return {
    AccessTokenFailureReason: {
      EXPIRED: 'expired',
      VERIFICATION_FAILED: 'verification_failed',
    },
    AccessTokenVerificationError: class AccessTokenVerificationError extends UnauthorizedException {},
    AuthCookieService: class AuthCookieService {},
    AuthSessionService: class AuthSessionService {},
    IdentityHubTokenProtocolError: class IdentityHubTokenProtocolError extends Error {},
    IdentityHubTokenRequestError: class IdentityHubTokenRequestError extends Error {},
    IdentityHubUnavailableError: class IdentityHubUnavailableError extends Error {},
    SessionReauthorizationRequiredError: class SessionReauthorizationRequiredError extends Error {},
    TokenVerifierService: class TokenVerifierService {},
  };
});

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { OAuthGuard } from './auth.guard';
import type { User } from 'src/modules/users/entities';
import type { AuthCookieService, AuthSessionService, TokenVerifierService } from '../services';

describe('OAuthGuard', () => {
  function createContext(request: Record<string, unknown>, response: Record<string, unknown>): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(() => ({
        getRequest: () => request,
        getResponse: () => response,
      })),
    } as unknown as ExecutionContext;
  }

  it('accepts a local shadow user through the opaque local session', async () => {
    const request: Record<string, unknown> = {};
    const response = {};
    const user = {
      externalKey: 'IDH-U-1',
      roles: [],
    } as User;
    const reflector = { getAllAndOverride: jest.fn(() => false) };
    const authSessionService = {
      findActiveSession: jest.fn(() =>
        Promise.resolve({
          id: 'session-id',
          accessToken: 'server-side-access-token',
          refreshTokenExpiresAt: new Date(Date.now() + 60_000),
          user,
        }),
      ),
    };
    const authCookieService = {
      getSessionId: jest.fn(() => 'session-id'),
      clearSessionCookie: jest.fn(),
    };
    const tokenVerifierService = {
      verifyAccessToken: jest.fn(() => Promise.resolve({ externalKey: 'IDH-U-1' })),
    };
    const guard = new OAuthGuard(
      reflector as unknown as Reflector,
      authSessionService as unknown as AuthSessionService,
      authCookieService as unknown as AuthCookieService,
      tokenVerifierService as unknown as TokenVerifierService,
    );

    await expect(guard.canActivate(createContext(request, response))).resolves.toBe(true);
    expect(request['user']).toBe(user);
  });

  it('returns the standard unauthorized response when the local session is missing', async () => {
    const response = {};
    const authCookieService = {
      getSessionId: jest.fn(() => 'missing-session'),
      clearSessionCookie: jest.fn(),
    };
    const guard = new OAuthGuard(
      { getAllAndOverride: jest.fn(() => false) } as unknown as Reflector,
      { findActiveSession: jest.fn(() => Promise.resolve(null)) } as unknown as AuthSessionService,
      authCookieService as unknown as AuthCookieService,
      {} as TokenVerifierService,
    );

    try {
      await guard.canActivate(createContext({}, response));
      fail('Expected OAuthGuard to reject the missing session');
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).getResponse()).toEqual({
        error: 'Unauthorized',
        message: 'Session expired. Please login again.',
        statusCode: 401,
      });
      expect(authCookieService.clearSessionCookie).toHaveBeenCalledWith(response);
    }
  });
});
