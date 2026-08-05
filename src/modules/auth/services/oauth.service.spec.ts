jest.mock('./token-verifier.service', () => ({
  TokenVerifierService: class TokenVerifierService {},
}));

import { ConfigService } from '@nestjs/config';

import { EnvironmentVariables } from 'src/config';
import { OAuthService } from './oauth.service';

describe('OAuthService', () => {
  it('builds an Authorization Code request with PKCE S256 and a derived callback', async () => {
    const configuration: Partial<EnvironmentVariables> = {
      IDENTITY_HUB_PUBLIC_URL: 'https://identity.example.org',
      INTRANET_PUBLIC_URL: 'https://intranet.example.org',
      OAUTH_CLIENT_ID: 'intranet',
    };
    const configService = {
      getOrThrow: jest.fn((key: keyof EnvironmentVariables) => configuration[key]),
    } as unknown as ConfigService<EnvironmentVariables, true>;
    const pkceService = {
      generateCodeVerifier: jest.fn(() => 'v'.repeat(64)),
      buildCodeChallenge: jest.fn(() => 'pkce-challenge'),
    };
    const oauthTransactionService = {
      create: jest.fn().mockResolvedValue('transaction-id'),
    };
    const service = new OAuthService(
      {} as never,
      {} as never,
      {} as never,
      configService,
      pkceService,
      oauthTransactionService as never,
      {} as never,
    );

    const result = await service.createAuthorizationRequest();
    const authorizeUrl = new URL(result.url);
    const state = authorizeUrl.searchParams.get('state');

    expect(authorizeUrl.origin).toBe('https://identity.example.org');
    expect(authorizeUrl.pathname).toBe('/oauth/authorize');
    expect(authorizeUrl.searchParams.get('response_type')).toBe('code');
    expect(authorizeUrl.searchParams.get('client_id')).toBe('intranet');
    expect(authorizeUrl.searchParams.get('redirect_uri')).toBe('https://intranet.example.org/auth/callback');
    expect(authorizeUrl.searchParams.get('code_challenge')).toBe('pkce-challenge');
    expect(authorizeUrl.searchParams.get('code_challenge_method')).toBe('S256');
    expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(oauthTransactionService.create).toHaveBeenCalledWith(state, 'v'.repeat(64));
    expect(result.transactionId).toBe('transaction-id');
  });
});
