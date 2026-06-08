jest.mock('../services/oauth.service', () => ({
  OAuthService: class OAuthService {},
}));

import { OAuthController } from './oauth.controller';

describe('OAuthController', () => {
  function createController() {
    const oauthService = {
      createAuthorizationRequest: jest.fn(() => ({
        url: 'http://localhost:8000/oauth/authorize',
        state: 'state',
        codeVerifier: 'verifier',
      })),
      completeAuthorizationCodeFlow: jest.fn(),
    };
    const authCookieService = {
      setOAuthTransactionCookies: jest.fn(),
      getOAuthState: jest.fn<string | undefined, []>(() => 'state'),
      getPkceVerifier: jest.fn<string | undefined, []>(() => 'verifier'),
      clearOAuthTransactionCookies: jest.fn(),
      clearAuthCookies: jest.fn(),
      setAuthCookies: jest.fn(),
    };
    const authRedirectService = {
      buildSuccessRedirectUrl: jest.fn(() => '/admin'),
      buildErrorRedirectUrl: jest.fn((error: string) => `/auth/error?error=${error}`),
    };
    const controller = new OAuthController(oauthService as any, authCookieService as any, authRedirectService as any);
    const response = {
      redirect: jest.fn((url: string) => url),
    };

    return { controller, oauthService, authCookieService, authRedirectService, response };
  }

  it('rejects callback with invalid state before token exchange', async () => {
    const { controller, oauthService, response } = createController();

    await controller.callback({} as any, { code: 'code', state: 'wrong-state' } as any, response as any);

    expect(response.redirect).toHaveBeenCalledWith('/auth/error?error=invalid_state');
    expect(oauthService.completeAuthorizationCodeFlow).not.toHaveBeenCalled();
  });

  it('rejects callback without a stored PKCE verifier', async () => {
    const { controller, oauthService, authCookieService, response } = createController();
    authCookieService.getPkceVerifier.mockReturnValue(undefined);

    await controller.callback({} as any, { code: 'code', state: 'state' } as any, response as any);

    expect(response.redirect).toHaveBeenCalledWith('/auth/error?error=missing_code_verifier');
    expect(oauthService.completeAuthorizationCodeFlow).not.toHaveBeenCalled();
  });
});
