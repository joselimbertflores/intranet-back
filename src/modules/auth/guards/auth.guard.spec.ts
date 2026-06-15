jest.mock('../services', () => {
  const { UnauthorizedException } = jest.requireActual('@nestjs/common');

  return {
    AccessTokenVerificationError: class AccessTokenVerificationError extends UnauthorizedException {
      canAttemptRefresh = false;
      reason = 'invalid';
    },
    AuthCookieService: class AuthCookieService {},
    IdentityService: class IdentityService {},
    TokenVerifierService: class TokenVerifierService {},
  };
});

jest.mock(
  'src/modules/users/services',
  () => ({
    UsersService: class UsersService {},
  }),
  { virtual: true },
);

import { ExecutionContext } from '@nestjs/common';

import { OAuthGuard } from './auth.guard';
import type { User } from 'src/modules/users/entities';

describe('OAuthGuard', () => {
  it('accepts authenticated requests when the local shadow user exists without checking local isActive', async () => {
    const request: Record<string, unknown> = {};
    const response = {};
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(() => ({
        getRequest: () => request,
        getResponse: () => response,
      })),
    } as unknown as ExecutionContext;
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
    };
    const authCookieService = {
      getAccessToken: jest.fn(() => 'access-token'),
      getRefreshToken: jest.fn(() => undefined),
      clearAuthCookies: jest.fn(),
    };
    const tokenVerifierService = {
      verifyAccessToken: jest.fn(() =>
        Promise.resolve({
          externalKey: 'IDH-U-1',
        }),
      ),
    };
    const usersService = {
      findByExternalKey: jest.fn(() =>
        Promise.resolve({
          externalKey: 'IDH-U-1',
          roles: [],
        } as User),
      ),
    };
    const guard = new OAuthGuard(
      reflector as any,
      usersService as any,
      {} as any,
      authCookieService as any,
      tokenVerifierService as any,
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request['user']).toEqual({
      externalKey: 'IDH-U-1',
      roles: [],
    });
  });
});
