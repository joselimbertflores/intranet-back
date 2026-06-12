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

import { ExecutionContext, ForbiddenException } from '@nestjs/common';

import { OAuthGuard } from './auth.guard';
import type { User } from 'src/modules/users/entities';

describe('OAuthGuard', () => {
  it('rejects authenticated requests with an inactive local shadow user as forbidden', async () => {
    const request = {};
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
          isActive: false,
          roles: [],
        } as User),
      ),
    };
    const guard = new OAuthGuard(
      reflector as any,
      {} as any,
      usersService as any,
      authCookieService as any,
      tokenVerifierService as any,
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
