jest.mock('./token-verifier.service', () => ({
  TokenVerifierService: class TokenVerifierService {},
}));

import { OAuthService } from './oauth.service';

describe('OAuthService', () => {
  it('creates an authorization request with PKCE S256 parameters', () => {
    const codeVerifier = 'verifier-123';
    const codeChallenge = 'challenge-123';
    const configService = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          IDENTITY_HUB_URL: 'http://localhost:8000',
          OAUTH_CLIENT_ID: 'intranet',
          OAUTH_REDIRECT_URI: 'http://localhost:3000/auth/callback',
        };
        return values[key];
      }),
    };
    const pkceService = {
      generateCodeVerifier: jest.fn(() => codeVerifier),
      buildCodeChallenge: jest.fn(() => codeChallenge),
    };

    const service = new OAuthService({} as any, {} as any, {} as any, configService as any, pkceService as any);

    const result = service.createAuthorizationRequest();
    const url = new URL(result.url);

    expect(url.toString()).toMatch(/^http:\/\/localhost:8000\/oauth\/authorize\?/);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('intranet');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/auth/callback');
    expect(url.searchParams.get('state')).toBe(result.state);
    expect(url.searchParams.get('code_challenge')).toBe(codeChallenge);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(result.codeVerifier).toBe(codeVerifier);
    expect(pkceService.buildCodeChallenge).toHaveBeenCalledWith(codeVerifier);
  });
});
