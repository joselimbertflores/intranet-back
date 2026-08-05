jest.mock('./jwks.service', () => ({
  JwksService: class JwksService {},
}));

import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync } from 'crypto';
import jwt from 'jsonwebtoken';

import { EnvironmentVariables } from 'src/config';
import type { JwksService } from './jwks.service';
import {
  AccessTokenFailureReason,
  TokenVerifierService,
} from './token-verifier.service';

describe('TokenVerifierService', () => {
  const issuer = 'https://identity.example.org';
  const audience = 'intranet';
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicKeyPem = publicKey.export({ format: 'pem', type: 'spki' }).toString();

  const configService = {
    getOrThrow: jest.fn((key: keyof EnvironmentVariables) => {
      if (key === 'IDENTITY_HUB_PUBLIC_URL') return issuer;
      if (key === 'OAUTH_CLIENT_ID') return audience;
      throw new Error(`Unexpected configuration key: ${key}`);
    }),
  } as unknown as ConfigService<EnvironmentVariables, true>;

  const getPublicKey = jest.fn().mockResolvedValue(publicKeyPem);
  const jwksService = { getPublicKey } as unknown as JwksService;

  const service = new TokenVerifierService(jwksService, configService);

  function signAccessToken(tokenIssuer: string, tokenAudience: string): string {
    return jwt.sign(
      {
        externalKey: 'IDH-U-1',
        name: 'Intranet User',
      },
      privateKey,
      {
        algorithm: 'RS256',
        keyid: 'identity-hub-key',
        issuer: tokenIssuer,
        audience: tokenAudience,
        subject: 'identity-hub-user-id',
        expiresIn: 60,
      },
    );
  }

  it('validates a token against the public Identity Hub URL and client ID', async () => {
    const payload = await service.verifyAccessToken(signAccessToken(issuer, audience));

    expect(payload.iss).toBe(issuer);
    expect(payload.aud).toBe(audience);
    expect(payload.externalKey).toBe('IDH-U-1');
    expect(getPublicKey).toHaveBeenCalledWith('identity-hub-key');
  });

  it('rejects the previous non-URL issuer', async () => {
    await expect(service.verifyAccessToken(signAccessToken('identity-hub', audience))).rejects.toMatchObject({
      reason: AccessTokenFailureReason.INVALID_TOKEN,
    });
  });

  it('rejects an audience different from the Intranet client ID', async () => {
    await expect(service.verifyAccessToken(signAccessToken(issuer, 'another-client'))).rejects.toMatchObject({
      reason: AccessTokenFailureReason.INVALID_TOKEN,
    });
  });
});
