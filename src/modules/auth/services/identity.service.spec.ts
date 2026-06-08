import { of } from 'rxjs';

import { IdentityService } from './identity.service';

describe('IdentityService', () => {
  it('sends code_verifier during authorization code exchange', async () => {
    const tokenResponse = {
      accessToken: 'access',
      refreshToken: 'refresh',
      accessTokenExpiresIn: 300,
      refreshTokenExpiresIn: 3600,
      tokenType: 'Bearer',
    };
    const http = {
      post: jest.fn(() => of({ data: tokenResponse })),
    };
    const configService = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          IDENTITY_HUB_URL: 'http://localhost:8000',
          OAUTH_REDIRECT_URI: 'http://localhost:3000/auth/callback',
          OAUTH_CLIENT_ID: 'intranet',
          OAUTH_CLIENT_SECRET: 'secret',
        };
        return values[key];
      }),
    };
    const service = new IdentityService(http as any, configService as any);

    await expect(service.exchangeCodeForTokens('authorization-code', 'pkce-verifier')).resolves.toBe(tokenResponse);

    expect(http.post).toHaveBeenCalledWith(
      'http://localhost:8000/oauth/token',
      expect.objectContaining({
        grant_type: 'authorization_code',
        code: 'authorization-code',
        code_verifier: 'pkce-verifier',
        redirect_uri: 'http://localhost:3000/auth/callback',
        client_id: 'intranet',
        client_secret: 'secret',
      }),
    );
  });
});
