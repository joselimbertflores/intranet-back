import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AccessTokenPayload, TokenRequestResponse } from '../interfaces';
import { TokenVerifierService } from './token-verifier.service';
import { UsersService } from '../../users/services';
import { EnvironmentVariables } from 'src/config';
import { IdentityService } from './identity.service';

@Injectable()
export class OAuthService {
  constructor(
    private readonly identityService: IdentityService,
    private readonly userService: UsersService,
    private readonly tokenVerifierService: TokenVerifierService,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {}

  async completeAuthorizationCodeFlow(code: string): Promise<TokenRequestResponse> {
    const tokens = await this.identityService.exchangeCodeForTokens(code);
    const decodedAccessToken = await this.tokenVerifierService.verifyAccessToken(tokens.accessToken);
    await this.syncLocalUserFromIdentity(decodedAccessToken);

    return tokens;
  }

  buildAuthorizeUrl() {
    const identityHubUrl = this.configService.getOrThrow<string>('IDENTITY_HUB_URL');
    const clientId = this.configService.getOrThrow<string>('OAUTH_CLIENT_ID');
    const redirectUri = this.configService.getOrThrow<string>('OAUTH_REDIRECT_URI');
    const state = crypto.randomUUID();

    const authorizeUrl = new URL('oauth/authorize', this.ensureTrailingSlash(identityHubUrl));
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('state', state);

    return {
      url: authorizeUrl.toString(),
      state,
    };
  }

  private ensureTrailingSlash(value: string): string {
    return value.endsWith('/') ? value : `${value}/`;
  }

  private async syncLocalUserFromIdentity(decodedAccessToken: AccessTokenPayload) {
    await this.userService.syncUserFromIdentity(decodedAccessToken);
  }
}
