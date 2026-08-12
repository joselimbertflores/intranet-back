import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';

import { TokenVerifierService } from './token-verifier.service';
import { IdentityUserProvisioningService } from '../../users/services';
import { EnvironmentVariables } from 'src/config';
import { AuthIdentityService } from './auth-identity.service';
import { OAuthTransactionService } from './oauth-transaction.service';
import { AuthSessionService } from './auth-session.service';
import type { AuthSession } from '../entities/auth-session.entity';

@Injectable()
export class OAuthService {
  constructor(
    private readonly authIdentityService: AuthIdentityService,
    private readonly identityUserProvisioningService: IdentityUserProvisioningService,
    private readonly tokenVerifierService: TokenVerifierService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
    private readonly oauthTransactionService: OAuthTransactionService,
    private readonly authSessionService: AuthSessionService,
  ) {}

  async completeAuthorizationCodeFlow(code: string, codeVerifier: string): Promise<AuthSession> {
    const tokens = await this.authIdentityService.exchangeAuthorizationCode(code, codeVerifier);
    const decodedAccessToken = await this.tokenVerifierService.verifyAccessToken(tokens.access_token);
    const user = await this.identityUserProvisioningService.syncUserFromIdentity({
      externalKey: decodedAccessToken.externalKey,
      fullName: decodedAccessToken.name,
    });

    return this.authSessionService.createSession(user, tokens);
  }

  async createAuthorizationRequest(): Promise<{ url: string; transactionId: string }> {
    const identityHubUrl = this.configService.getOrThrow('IDENTITY_HUB_PUBLIC_URL', { infer: true });
    const clientId = this.configService.getOrThrow('OAUTH_CLIENT_ID', { infer: true });
    const redirectUri = this.getRedirectUri();
    const state = randomBytes(32).toString('base64url');
    const codeVerifier = randomBytes(64).toString('base64url');
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

    const authorizeUrl = new URL('oauth/authorize', this.ensureTrailingSlash(identityHubUrl));
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('code_challenge', codeChallenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');
    const transactionId = await this.oauthTransactionService.create(state, codeVerifier);

    return {
      url: authorizeUrl.toString(),
      transactionId,
    };
  }

  private ensureTrailingSlash(value: string): string {
    return value.endsWith('/') ? value : `${value}/`;
  }

  private getRedirectUri(): string {
    const intranetPublicUrl = this.configService.getOrThrow('INTRANET_PUBLIC_URL', { infer: true });
    return new URL('/auth/callback', intranetPublicUrl).toString();
  }
}
